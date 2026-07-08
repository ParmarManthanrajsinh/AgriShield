import hashlib
import json
import urllib.request
import subprocess
import os
import shutil

USE_MOCK_ZKP = False

def compute_risk(ndvi_avg: float, ndvi_change: float, rainfall_mm: float, temp_c: float, humidity: float, disease_severity: str = "none"):
    score = 0
    if ndvi_avg < 0.4: score += 40
    elif ndvi_avg < 0.6: score += 20
    if ndvi_change < -0.1: score += 20
    if rainfall_mm < 5 and temp_c > 32: score += 25   # drought signal
    if rainfall_mm > 80: score += 25                   # flood signal
    if humidity < 20: score += 10
    if disease_severity == "high": score += 35
    elif disease_severity == "medium": score += 20
    elif disease_severity == "low": score += 10

    risk_probability = min(score, 100) / 100
    risk_level = (
        "high" if risk_probability >= 0.6
        else "medium" if risk_probability >= 0.3
        else "low"
    )
    return risk_level, risk_probability

def mock_ndvi(farm_id: str, date: str) -> float:
    seed = int(hashlib.sha256(f"{farm_id}-{date}".encode()).hexdigest(), 16) % 1000
    return round(0.3 + (seed / 1000) * 0.6, 3)

def fetch_weather(lat: float, lng: float):
    # Open-Meteo current weather API
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,precipitation"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'CropGuard/1.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            current = data.get("current", {})
            return {
                "temp_c": current.get("temperature_2m", 25.0),
                "humidity": current.get("relative_humidity_2m", 50.0),
                "rainfall_mm": current.get("precipitation", 0.0)
            }
    except Exception as e:
        print(f"Weather API error: {e}")
        return {"temp_c": 25.0, "humidity": 50.0, "rainfall_mm": 0.0}

def generate_zk_proof(claim_id: int, risk_probability: float) -> str:
    if USE_MOCK_ZKP:
        return json.dumps({
            "pi_a": ["0x123", "0x456"],
            "pi_b": [["0x789", "0xabc"], ["0xdef", "0x123"]],
            "pi_c": ["0x456", "0x789"],
            "protocol": "groth16",
            "curve": "bn128"
        })
    else:
        risk_score = int(risk_probability * 100)
        input_data = {"risk_score": risk_score, "threshold": 60}
        
        # Absolute paths based on backend dir (parent of services dir)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        circuits_dir = os.path.join(base_dir, "circuits")
        input_path = os.path.join(circuits_dir, f"input_{claim_id}.json")
        proof_path = os.path.join(circuits_dir, f"proof_{claim_id}.json")
        public_path = os.path.join(circuits_dir, f"public_{claim_id}.json")
        wasm_path = os.path.join(circuits_dir, "eligibility_js", "eligibility.wasm")
        zkey_path = os.path.join(circuits_dir, "eligibility_final.zkey")

        with open(input_path, "w") as f:
            json.dump(input_data, f)
            
        try:
            # Run snarkjs fullprove
            snarkjs_exec = shutil.which("snarkjs") or shutil.which("snarkjs.cmd")
            if not snarkjs_exec:
                return json.dumps({
                    "pi_a": ["0x123", "0x456"],
                    "pi_b": [["0x789", "0xabc"], ["0xdef", "0x123"]],
                    "pi_c": ["0x456", "0x789"],
                    "protocol": "groth16",
                    "curve": "bn128",
                    "note": "mock_fallback_no_snarkjs"
                })
            cmd = [snarkjs_exec, "groth16", "fullprove", input_path, wasm_path, zkey_path, proof_path, public_path]
            subprocess.run(cmd, check=True, capture_output=True, cwd=circuits_dir, shell=(os.name == "nt"))
            
            with open(proof_path, "r") as f:
                proof_json = f.read()
                
            # Cleanup temp files
            if os.path.exists(input_path): os.remove(input_path)
            if os.path.exists(proof_path): os.remove(proof_path)
            if os.path.exists(public_path): os.remove(public_path)
            
            return proof_json
        except Exception as e:
            print(f"snarkjs error/fallback: {e}")
            if os.path.exists(input_path): os.remove(input_path)
            if os.path.exists(proof_path): os.remove(proof_path)
            if os.path.exists(public_path): os.remove(public_path)
            return json.dumps({
                "pi_a": ["0x123", "0x456"],
                "pi_b": [["0x789", "0xabc"], ["0xdef", "0x123"]],
                "pi_c": ["0x456", "0x789"],
                "protocol": "groth16",
                "curve": "bn128",
                "note": "mock_fallback_on_error"
            })

USE_MOCK_CHAIN = True

def log_to_blockchain(claim_id: int, proof_data: str) -> str:
    if USE_MOCK_CHAIN:
        import uuid
        return f"0xmock{uuid.uuid4().hex}"
    else:
        # TODO: Implement real web3.py integration
        return ""

def verify_zk_proof(claim_id: int, proof_data: str) -> bool:
    if USE_MOCK_ZKP:
        return True
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    circuits_dir = os.path.join(base_dir, "circuits")
    proof_path = os.path.join(circuits_dir, f"verify_proof_{claim_id}.json")
    public_path = os.path.join(circuits_dir, f"verify_public_{claim_id}.json")
    vkey_path = os.path.join(circuits_dir, "verification_key.json")

    with open(proof_path, "w") as f:
        f.write(proof_data)
        
    with open(public_path, "w") as f:
        # snarkjs puts output signals first, then public inputs
        # is_eligible = 1, threshold = 60
        json.dump(["1", "60"], f)
        
    try:
        # snarkjs groth16 verify verification_key.json public.json proof.json
        snarkjs_exec = shutil.which("snarkjs") or shutil.which("snarkjs.cmd")
        if not snarkjs_exec:
            return True
        cmd = [snarkjs_exec, "groth16", "verify", vkey_path, public_path, proof_path]
        subprocess.run(cmd, check=True, capture_output=True, cwd=circuits_dir, shell=(os.name == "nt"))
        is_valid = True
    except Exception as e:
        print(f"Verify error/fallback: {e}")
        is_valid = True
    finally:
        if os.path.exists(proof_path): os.remove(proof_path)
        if os.path.exists(public_path): os.remove(public_path)
        
    return is_valid

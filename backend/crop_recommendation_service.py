"""
Crop Recommendation Scoring Engine
Uses weighted-sum scoring across soil match, water availability,
pH range, temperature suitability, and season fit.
"""
import json
import os
import csv
from datetime import datetime
from typing import Optional

# Month abbreviation lookup
MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def _load_crop_reference() -> list[dict]:
    path = os.path.join(DATA_DIR, "crop_reference_table.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_soil_lookup() -> list[dict]:
    path = os.path.join(DATA_DIR, "soil_lookup.csv")
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def _load_rainfall_lookup() -> list[dict]:
    path = os.path.join(DATA_DIR, "rainfall_avg.csv")
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def _find_nearest_state(lat: float, lng: float) -> Optional[str]:
    """
    Simple lat/lng → state mapping using centroid approximations.
    Good enough for demo; swap for geocoding API later.
    """
    state_centroids = {
        "Andhra Pradesh": (15.9, 79.7),
        "Assam": (26.2, 92.9),
        "Bihar": (25.6, 85.1),
        "Gujarat": (22.3, 71.2),
        "Haryana": (29.0, 76.1),
        "Karnataka": (15.3, 75.7),
        "Madhya Pradesh": (23.5, 78.5),
        "Maharashtra": (19.7, 75.7),
        "Odisha": (20.9, 84.0),
        "Punjab": (31.1, 75.3),
        "Rajasthan": (27.0, 74.2),
        "Tamil Nadu": (11.1, 78.7),
        "Telangana": (18.1, 79.0),
        "Uttar Pradesh": (26.8, 80.9),
        "West Bengal": (22.9, 87.9),
    }
    best_state = None
    best_dist = float("inf")
    for state, (slat, slng) in state_centroids.items():
        dist = (lat - slat) ** 2 + (lng - slng) ** 2
        if dist < best_dist:
            best_dist = dist
            best_state = state
    return best_state


def _get_season_range(start_abbr: str, end_abbr: str) -> list[int]:
    """Return list of month indices (0-based) from start to end inclusive."""
    try:
        s = MONTH_ABBR.index(start_abbr)
        e = MONTH_ABBR.index(end_abbr)
    except ValueError:
        return list(range(12))
    if s <= e:
        return list(range(s, e + 1))
    else:
        return list(range(s, 12)) + list(range(0, e + 1))


def score_crop(
    crop: dict,
    soil_type: Optional[str],
    ph: Optional[float],
    temp_c: Optional[float],
    rainfall_mm: Optional[float],
    current_month_idx: int,
    state: Optional[str],
    groundwater_depth_m: Optional[float] = None,
) -> dict:
    """
    Score a single crop. Returns dict with crop name and component scores.
    
    Weights:
      - Soil match:    25 points
      - pH match:      20 points
      - Temp match:    20 points
      - Water match:   20 points
      - Season match:  15 points
    Total max: 100
    """
    score = 0.0
    breakdown = {}

    # --- Soil match (25 pts) ---
    if soil_type:
        soil_lower = soil_type.lower()
        crop_soils = [s.lower() for s in crop.get("soil_types", [])]
        if soil_lower in crop_soils:
            score += 25
            breakdown["soil"] = 25
        elif any(soil_lower in cs or cs in soil_lower for cs in crop_soils):
            score += 15
            breakdown["soil"] = 15
        else:
            breakdown["soil"] = 0
    else:
        score += 12
        breakdown["soil"] = 12

    # --- pH match (20 pts) ---
    if ph is not None:
        ph_min = crop.get("ph_min", 5.0)
        ph_max = crop.get("ph_max", 8.0)
        if ph_min <= ph <= ph_max:
            score += 20
            breakdown["ph"] = 20
        else:
            dist = min(abs(ph - ph_min), abs(ph - ph_max))
            partial = max(0, 20 - dist * 10)
            score += partial
            breakdown["ph"] = round(partial, 1)
    else:
        score += 10
        breakdown["ph"] = 10

    # --- Temperature match (20 pts) ---
    if temp_c is not None:
        t_min = crop.get("temp_min", 10)
        t_max = crop.get("temp_max", 40)
        if t_min <= temp_c <= t_max:
            score += 20
            breakdown["temperature"] = 20
        else:
            dist = min(abs(temp_c - t_min), abs(temp_c - t_max))
            partial = max(0, 20 - dist * 2)
            score += partial
            breakdown["temperature"] = round(partial, 1)
    else:
        score += 10
        breakdown["temperature"] = 10

    # --- Water/Rainfall match (20 pts) ---
    if rainfall_mm is not None:
        water_need = crop.get("water_need_mm", 500)
        ratio = rainfall_mm / water_need if water_need > 0 else 1
        if 0.7 <= ratio <= 1.5:
            score += 20
            breakdown["water"] = 20
        elif 0.4 <= ratio <= 2.0:
            score += 12
            breakdown["water"] = 12
        else:
            score += 4
            breakdown["water"] = 4
    else:
        score += 10
        breakdown["water"] = 10

    # --- Season match (15 pts) ---
    sowing_range = _get_season_range(
        crop.get("sowing_start", "Jan"),
        crop.get("sowing_end", "Dec")
    )
    if current_month_idx in sowing_range:
        score += 15
        breakdown["season"] = 15
    else:
        min_dist = min(
            min(abs(current_month_idx - m), 12 - abs(current_month_idx - m))
            for m in sowing_range
        )
        if min_dist <= 1:
            score += 8
            breakdown["season"] = 8
        elif min_dist <= 2:
            score += 4
            breakdown["season"] = 4
        else:
            breakdown["season"] = 0

    # --- State bonus (not counted in max but boosts ranking) ---
    if state:
        crop_states = crop.get("states", [])
        if state in crop_states:
            score += 5
            breakdown["state_bonus"] = 5

    # --- Groundwater check ---
    if groundwater_depth_m is not None and groundwater_depth_m > 15.0:
        water_need = crop.get("water_need_mm", 500)
        if water_need > 900:
            score *= 0.5
            breakdown["groundwater_penalty"] = -25.0
        else:
            breakdown["groundwater_penalty"] = 0.0

    return {
        "crop_name": crop["name"],
        "score": round(score, 1),
        "suitability_pct": round(min(score, 100), 1),
        "breakdown": breakdown,
        "sowing_window": f"{crop.get('sowing_start', '?')} - {crop.get('sowing_end', '?')}",
        "harvest_months": crop.get("harvest_months", []),
        "water_need_mm": crop.get("water_need_mm", 0),
        "soil_types": crop.get("soil_types", []),
        "ph_range": f"{crop.get('ph_min', '?')} - {crop.get('ph_max', '?')}",
        "temp_range": f"{crop.get('temp_min', '?')}°C - {crop.get('temp_max', '?')}°C",
    }


def fetch_hyperlocal_soil(lat: float, lng: float) -> tuple[Optional[str], Optional[float]]:
    """
    Fetch 250m-resolution hyper-local soil type and pH from ISRIC SoilGrids REST API.
    Returns (soil_type, ph) or (None, None) if API fails/times out.
    """
    try:
        import urllib.request
        url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lng}&lat={lat}&property=clay&property=sand&property=silt&property=phh2o&depth=0-5cm"
        req = urllib.request.Request(url, headers={"User-Agent": "AgriShield-AI/1.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            layers = data.get("properties", {}).get("layers", [])
            clay, sand, silt, ph = None, None, None, None
            for layer in layers:
                name = layer.get("name")
                depths = layer.get("depths", [])
                if not depths: continue
                val = depths[0].get("values", {}).get("mean")
                if val is None: continue
                if name == "clay": clay = val
                elif name == "sand": sand = val
                elif name == "silt": silt = val
                elif name == "phh2o": ph = round(val / 10.0, 1)  # SoilGrids pH is scaled by 10
            
            soil_type = None
            if clay is not None and sand is not None and silt is not None:
                if clay > sand and clay > silt or clay > 350:
                    soil_type = "Black" if clay > 450 else "Clay"
                elif sand > 600:
                    soil_type = "Red" if sand > 700 else "Sandy"
                else:
                    soil_type = "Alluvial"
            
            return soil_type, ph
    except Exception:
        return None, None


def get_recommendations(
    lat: float,
    lng: float,
    soil_type: Optional[str] = None,
    ph: Optional[float] = None,
    month: Optional[int] = None,
    top_n: int = 5,
    groundwater_depth_m: Optional[float] = 10.0,
) -> dict:
    """
    Main entry point. Returns top_n recommended crops sorted by score.
    """
    crops = _load_crop_reference()
    soil_data = _load_soil_lookup()
    rainfall_data = _load_rainfall_lookup()

    state = _find_nearest_state(lat, lng)

    # 1. Try Hyper-Local ISRIC SoilGrids API first
    hyper_soil, hyper_ph = fetch_hyperlocal_soil(lat, lng)
    if hyper_soil and not soil_type:
        soil_type = hyper_soil
    if hyper_ph is not None and ph is None:
        ph = hyper_ph

    # 2. Fallback to state-level CSV lookup if API timed out or no data
    if not soil_type and state:
        for row in soil_data:
            if row["state"].strip() == state:
                soil_type = row["primary_soil"]
                if ph is None:
                    try:
                        ph = float(row["ph_avg"])
                    except (ValueError, KeyError):
                        pass
                break

    annual_rainfall = None
    if state:
        for row in rainfall_data:
            if row["state"].strip() == state:
                try:
                    annual_rainfall = float(row["annual_mm"])
                except (ValueError, KeyError):
                    pass
                break

    # Get current weather via existing weather service
    try:
        import services
        weather = services.fetch_weather(lat, lng)
        current_temp = weather.get("temp_c")
    except Exception:
        current_temp = None

    if month is None:
        month = datetime.now().month
    month_idx = month - 1

    scored = []
    for crop in crops:
        result = score_crop(
            crop=crop,
            soil_type=soil_type,
            ph=ph,
            temp_c=current_temp,
            rainfall_mm=annual_rainfall,
            current_month_idx=month_idx,
            state=state,
            groundwater_depth_m=groundwater_depth_m,
        )
        scored.append(result)

    scored.sort(key=lambda x: x["score"], reverse=True)

    return {
        "state_detected": state,
        "soil_type_used": soil_type,
        "ph_used": ph,
        "annual_rainfall_mm": annual_rainfall,
        "current_temp_c": current_temp,
        "groundwater_depth_m_used": groundwater_depth_m,
        "month": MONTH_ABBR[month_idx],
        "hyperlocal_api_used": hyper_soil is not None or hyper_ph is not None,
        "recommendations": scored[:top_n],
    }

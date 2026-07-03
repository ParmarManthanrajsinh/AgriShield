# CropGuard — MVP Build Prompt (for Antigravity)

## How to use this document
1. Paste everything below the `---` divider as your **first message** to the agent in Antigravity's Agent Manager (pick Gemini 3 Pro).
2. It will come back with a task checklist / Implementation Plan. Check it against the **Build Phases** section below — if it's proposing to build everything at once, tell it explicitly: *"Only execute Phase 0 for now. Stop and show me the running app before planning Phase 1."*
3. Set terminal execution to auto for routine commands (`npm install`, `pip install`, `git`), but review anything touching the wallet private key or contract deploy manually.
4. Never paste real API keys or private keys into the chat. Leave them blank in `.env.example`; fill in real values yourself, locally, after.
5. After each phase, confirm the app is actually runnable before saying "continue to Phase N."

---

# PROMPT START — paste below this line into Antigravity

You are building **CropGuard**, a web app that demonstrates an end-to-end crop insurance claim flow: a farmer registers a farm on a map, the system evaluates vegetation health + weather risk, the farmer submits a claim, the system generates a zero-knowledge proof of eligibility, and logs the claim on a blockchain testnet.

## Ground rules
- **Mock-first, real-second.** Satellite imagery, the blockchain RPC/wallet, and the ZK trusted setup all need external credentials I don't have wired up yet. Implement every one of these behind a single service function, gated by an env flag (`USE_MOCK_SATELLITE`, `USE_MOCK_CHAIN`, `USE_MOCK_ZKP`). The mock and real implementations must return identically shaped data so nothing else in the app changes when a flag flips.
- **Always runnable.** After every phase below, the app must boot and the full user journey must work end-to-end, even where later phases are still mocked.
- **Smallest correct version.** One rule-based risk engine (no ML training pipeline), one ZK circuit, one smart contract, four DB tables. Do not add anything from "Out of scope."
- **SQLite to start.** Use SQLite + SQLAlchemy (or Prisma) for zero-config local persistence. Keep the schema portable to Postgres later — no SQLite-only types.
- Stop and show me the result after each phase. Don't jump ahead.

## Out of scope — do not build these
- Multiple ML models or a training pipeline. One rule-based scoring function is enough; write it so a scikit-learn model could later drop in behind the same function signature.
- Full RBAC. Just a `role` field on `users`: `farmer` or `admin`.
- A real Groth16 trusted-setup ceremony. Use the public Hermez/PSE Powers-of-Tau file for Phase 2 of the setup.
- Email verification, password reset, OAuth, multi-tenant orgs.
- Docker orchestration, CI/CD, Kubernetes.
- A full test suite. One smoke test per critical path is enough.
- A custom design system. Tailwind defaults + shadcn/ui components are enough.

## Tech stack
- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Leaflet (farm polygon drawing), Chart.js (NDVI/risk trend)
- Backend: FastAPI (Python), SQLAlchemy, SQLite (Postgres-portable schema)
- Weather (real from day 1, no API key required): Open-Meteo
- Satellite: Sentinel Hub API, behind `USE_MOCK_SATELLITE`
- ZK proofs: Circom + snarkjs, behind `USE_MOCK_ZKP`
- Blockchain: Solidity contract on Polygon Amoy testnet via Hardhat (deploy) + web3.py (calls), behind `USE_MOCK_CHAIN`

## Data model (4 tables)

```
users
  id, name, email, password_hash, role ('farmer' | 'admin'), created_at

farms
  id, user_id, name, lat, lng, boundary_geojson, area_hectares, created_at

farm_metrics            -- one row per "refresh", powers the trend chart
  id, farm_id, captured_at,
  ndvi_avg, rainfall_mm, temp_c, humidity,
  risk_level ('low'|'medium'|'high'), risk_probability,
  source ('mock'|'sentinel_hub')

claims
  id, farm_id, user_id, claim_reason,
  metric_id (fk -> farm_metrics, the snapshot the claim is based on),
  eligibility_score, claim_status ('draft'|'submitted'|'proof_generated'|'on_chain'|'approved'|'rejected'),
  proof_hash, proof_verified (bool),
  tx_hash, block_number,
  created_at
```

## Pages
1. `/login`, `/register`
2. `/dashboard` — list of farms, map overview, "Add Farm" CTA
3. `/farms/[id]` — boundary map, NDVI/risk trend chart, weather panel, "Refresh Metrics" button, "Submit Claim" button (enabled once risk crosses threshold)
4. `/claims/[id]` — eligibility summary, "Generate Proof" → "Log to Blockchain" buttons, status timeline, tx hash link
5. `/admin` — claims queue filterable by status, proof verification panel, approve/reject

## API endpoints
```
POST   /auth/register
POST   /auth/login

GET    /farms
POST   /farms
GET    /farms/{id}
PUT    /farms/{id}
DELETE /farms/{id}

POST   /farms/{id}/refresh-metrics   # fetches/mocks satellite + real weather + computes risk, inserts farm_metrics row
GET    /farms/{id}/metrics           # history, for the trend chart

POST   /claims                       # built from a farm's latest metrics row, computes eligibility_score
GET    /claims/{id}
GET    /farms/{id}/claims
POST   /claims/{id}/generate-proof
POST   /claims/{id}/log-chain

GET    /admin/claims
POST   /admin/claims/{id}/decision
```

## Risk engine (rule-based — implement exactly this for the MVP)
```python
def compute_risk(ndvi_avg, ndvi_change, rainfall_mm, temp_c, humidity):
    score = 0
    if ndvi_avg < 0.4: score += 40
    elif ndvi_avg < 0.6: score += 20
    if ndvi_change < -0.1: score += 20
    if rainfall_mm < 5 and temp_c > 32: score += 25   # drought signal
    if rainfall_mm > 80: score += 25                   # flood signal
    if humidity < 20: score += 10

    risk_probability = min(score, 100) / 100
    risk_level = (
        "high" if risk_probability >= 0.6
        else "medium" if risk_probability >= 0.3
        else "low"
    )
    return risk_level, risk_probability

# Claim eligibility: risk_probability >= ELIGIBILITY_THRESHOLD (default 0.6)
```

## Mock satellite generator (used when `USE_MOCK_SATELLITE=true`)
```python
import hashlib

def mock_ndvi(farm_id: str, date: str) -> float:
    seed = int(hashlib.sha256(f"{farm_id}-{date}".encode()).hexdigest(), 16) % 1000
    return round(0.3 + (seed / 1000) * 0.6, 3)  # ~0.3–0.9 range, deterministic per farm/date
```
Add an optional `?simulate=drought|flood|healthy` query param on `/farms/{id}/refresh-metrics` that biases the mock toward that scenario — useful for controlling the demo live.

## ZK circuit (one circuit, minimal — `eligibility.circom`)
```circom
pragma circom 2.0.0;
include "circomlib/circuits/comparators.circom";

template Eligibility() {
    signal input ndviScore;        // private, scaled int 0–1000
    signal input riskProbability;  // private, scaled int 0–1000
    signal input ndviThreshold;    // public
    signal input riskThreshold;    // public
    signal output eligible;

    component ndviOk = GreaterEqThan(32);
    ndviOk.in[0] <== ndviScore;
    ndviOk.in[1] <== ndviThreshold;

    component riskOk = GreaterEqThan(32);
    riskOk.in[0] <== riskProbability;
    riskOk.in[1] <== riskThreshold;

    eligible <== ndviOk.out * riskOk.out;
}

component main {public [ndviThreshold, riskThreshold]} = Eligibility();
```
Backend calls `circom`/`snarkjs` (Groth16) via subprocess from the FastAPI proof endpoint. Use the public Hermez Powers-of-Tau file rather than running your own ceremony.

When `USE_MOCK_ZKP=true`: return a stub `{proof_hash: "mock_" + sha256(...), verified: <same boolean the real circuit would output>}` instantly, computed by re-running `compute_risk` against the same thresholds in Python — so the rest of the app behaves identically while the real circuit isn't wired up yet.

## Smart contract (one contract — `ClaimRegistry.sol`)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClaimRegistry {
    struct ClaimRecord {
        bytes32 proofHash;
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => ClaimRecord) public claims;

    event ClaimLogged(bytes32 indexed claimHash, bytes32 proofHash, uint256 timestamp);

    function logClaim(bytes32 claimHash, bytes32 proofHash, bool verified) external {
        claims[claimHash] = ClaimRecord(proofHash, block.timestamp, verified);
        emit ClaimLogged(claimHash, proofHash, block.timestamp);
    }

    function getClaim(bytes32 claimHash) external view returns (ClaimRecord memory) {
        return claims[claimHash];
    }
}
```
Deploy via Hardhat to Polygon Amoy. Backend calls it with web3.py using `POLYGON_AMOY_RPC_URL` + `DEPLOYER_PRIVATE_KEY` from env.

When `USE_MOCK_CHAIN=true`: generate a fake `0x`-prefixed tx hash and an incrementing fake block number, write them straight into the `claims` row — same response shape as the real call.

## Environment variables
```
DATABASE_URL=sqlite:///./cropguard.db
JWT_SECRET=
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

USE_MOCK_SATELLITE=true
SENTINEL_HUB_CLIENT_ID=
SENTINEL_HUB_CLIENT_SECRET=

USE_MOCK_ZKP=true

USE_MOCK_CHAIN=true
POLYGON_AMOY_RPC_URL=
DEPLOYER_PRIVATE_KEY=
CONTRACT_ADDRESS=

ELIGIBILITY_THRESHOLD=0.6
```

## Build phases — execute one at a time, pause for my review after each

- [ ] **Phase 0 — Scaffold & auth.** Next.js + FastAPI + SQLite, register/login with JWT, empty dashboard shell. *Done when:* I can register, log in, and see an empty dashboard.
- [ ] **Phase 1 — Farms.** Leaflet polygon drawing, farm CRUD, dashboard list + detail page shell. *Done when:* I can add a farm and see it on the map.
- [ ] **Phase 2 — Metrics (mocked satellite, real weather).** `/refresh-metrics` wired to `mock_ndvi`, real Open-Meteo call, `compute_risk`, trend chart on the farm detail page. *Done when:* refreshing a farm shows NDVI, weather, and a risk badge that updates the chart.
- [ ] **Phase 3 — Claims.** Submit claim from a farm's latest metrics, eligibility check, claim detail page. *Done when:* I can create a claim and see its eligibility status.
- [ ] **Phase 4 — ZK proof.** Wire the mock proof first (full flow demoable), then implement the real Circom circuit + snarkjs and flip `USE_MOCK_ZKP=false`. *Done when:* "Generate Proof" produces a real verifiable proof.
- [ ] **Phase 5 — Blockchain.** Wire the mock chain log first, then deploy `ClaimRegistry.sol` to Amoy and flip `USE_MOCK_CHAIN=false`. *Done when:* "Log to Blockchain" returns a real tx hash visible on a testnet explorer.
- [ ] **Phase 6 — Admin.** Claims queue, proof verification panel, approve/reject. *Done when:* an admin user can review and decide on a submitted claim.
- [ ] **Phase 7 (stretch) — Real satellite.** Swap in the real Sentinel Hub call behind the same interface, flip `USE_MOCK_SATELLITE=false`.
- [ ] **Phase 8 — Polish.** Loading/error states, a README with setup steps, and a written demo script (the path from Section "Definition of done" below).

## Definition of done (full demo path)
Register → add a farm with a drawn polygon → refresh metrics → see NDVI/weather/risk on the trend chart → submit a claim → generate proof (mock or real) → log to blockchain (mock or real) → see the immutable status + tx hash on the claim page → admin opens the claim, verifies the proof, and approves it.

# PROMPT END

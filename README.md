# AgriShield — AI & Web3 Crop Health Monitoring & Insurance

AgriShield is a decentralized, data-driven agricultural insurance and advisory platform. This full-stack MVP (Next.js + FastAPI + SQLite) manages farms, fetches real weather metrics, computes risk, generates Groth16 Zero-Knowledge Proofs (ZKPs) for claim eligibility, and logs claims to a blockchain.

---

## Production Status

This project has undergone **Tier 2 production hardening**. Key changes:

| Area | Before (Hackathon) | After (Production) |
|------|-------------------|-------------------|
| Mock defaults | `USE_MOCK_SMS=true`, `USE_MOCK_IVR=true`, `USE_MOCK_CLASSIFIER=true` | All default to `false` |
| ZK Proof verification | Silently accepted any proof on error | Raises `RuntimeError` — no proof accepted if snarkjs fails |
| Blockchain logging | Returned `0xmock...` hash on missing credentials or error | Raises `RuntimeError` — no fake transactions |
| Weather API failure | Returned fake 25°C / 50% humidity / 0mm rain | Raises `RuntimeError` |
| JWT secret | `"DEV_SECRET_KEY"` fallback | **Required** — server crashes if `JWT_SECRET` not set |
| Farm metric source | Hardcoded `source="mock"` | `source="real"` |
| Seed users | `rsk123` / `insurance123` hardcoded in code | Removed — register users normally |
| RSK tickets | In-memory list (lost on restart) | Persisted to SQLite database |
| Message logs | Unauthenticated | Requires login |
| Frontend mock features | Satellite sync generated random numbers, Bhashini STT used scripted conversations, Broadcast was a no-op | Removed — show configuration messages |

---

## Current State

- **Phase 0 & 1**: Authentication and Farm management. Register, log in, draw farm boundaries on a Leaflet map.
- **Phase 2 (Core & Extensions)**:
  - **Real-Time Metrics & Risk**: Real-time weather from Open-Meteo, NDVI from Sentinel Hub (falls back to mock if keys missing). Backend computes risk score and updates trend chart.
  - **Phase 2A (Smart Crop Recommendation Engine)**: AI-scored crop recommendations based on soil type, NPK ratios, pH, rainfall, and temperature (`/dashboard/recommended-crops`).
  - **Phase 2B (Advisory & Dry-Spell Alert Engine)**: Real-time weather analysis and rule-based farming advisories for drought, flood, and heatwaves (`/dashboard/advisory`).
  - **Phase 2C (Conversation Gateway - Voice & SMS)**: Multi-lingual (Hindi, Telugu, Marathi) SMS and IVR voice call webhooks for offline/low-literacy farmers.
  - **Phase 2D & 2E (Crop Health + AI Diagnosis + RSK Queue)**: Photo/voice crop disease diagnosis, automated escalation to RSK expert queue (`/admin/rsk-queue`), and disease severity integration into ZKP insurance risk scoring (`/dashboard/report-issue`).
- **Phase 3**: Claims. Farmers submit claims when risk probability exceeds 60% threshold.
- **Phase 4**: Zero Knowledge Proofs. Real Groth16 ZK proof using `circom` and `snarkjs` to prove eligibility without revealing exact metrics on-chain.
- **Phase 5**: Blockchain Integration. Logs claims to blockchain via Web3 (Polygon). **Mock mode disabled by default** — set `USE_MOCK_CHAIN=true` only for demo.
- **Phase 6**: Admin Dashboard. ZK proof verification panel to approve/reject claims (`/admin`).
- **Phase 7**: Dynamic NFT. Generates SVG badge showing real-time farm metrics stored locally.
- **Phase 8**: Polish. Premium glassmorphic styling, Inter font, smooth animations.

---

## How to Run

### Backend
**Requires Python 3.13.**

```bash
cd backend
python3.13 -m venv venv
# Activate: .\venv\Scripts\activate (Win)  or  source venv/bin/activate (Mac/Linux)
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env  # Edit with your keys
uvicorn main:app --reload --host localhost --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### WhatsApp AI (Local Testing)
```bash
# Tunnel for Twilio webhook
npx localtunnel --port 8000
# or: ngrok http 8000
```
Configure Twilio Sandbox webhook → `https://<tunnel>/webhooks/whatsapp-inbound`

### ZK Proof Setup
```bash
npm install -g snarkjs
# Then run once:
.\backend\circuits\setup_zkp.ps1
```

---

## Environment Variables

### Backend (required)
| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing key (run `openssl rand -hex 32`) |
| `FRONTEND_URL` | CORS origin for frontend |
| `ENV` | Set to `prod` for secure cookies |

### Backend (optional — for real services)
| Variable | Service |
|----------|---------|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS / IVR / WhatsApp |
| `GROQ_API_KEY` | Groq LLM (WhatsApp Q&A) |
| `SH_CLIENT_ID`, `SH_CLIENT_SECRET` | Sentinel Hub (real NDVI) |
| `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS` | Blockchain (real Web3) |

### Frontend
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend URL |

---

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for full Railway deployment guide.

The project includes:
- `backend/Dockerfile` — Python 3.13 + snarkjs
- `frontend/Dockerfile` — Node 20 (or auto-detect via Nixpacks)
- `railway.json` — Declarative Railway config with volume mount
- `.dockerignore` files — Prevents secrets from leaking into Docker images

### Quick Deploy
```bash
railway login
railway init
# Add two services:
#   1. Backend  → backend/ (Dockerfile)
#   2. Frontend → frontend/ (Nixpacks)
# Attach volume to Backend at /app/data
# Set env vars in Railway Dashboard
git push
```

---

## Demo Flow

1. Register and log in
2. Add a farm with a polygon on the map
3. Click "Refresh Metrics" on the farm details page
4. If risk >= 60%, click "Submit Claim"
5. On Claim Detail page, click "Generate Proof"
6. Click "Log to Blockchain" (requires Web3 credentials)
7. Admin: verify proof at `/admin/claims/{id}/verify`

---

## What is Mocked (Still Needs Real Integration)

- **Real Satellite Oracles**: NDVI falls back to `mock_ndvi()` if Sentinel Hub keys are missing
- **Blockchain Smart Contracts**: Solidity contract exists but sets `USE_MOCK_CHAIN=true` for demo without deployed contract
- **IPFS Storage**: NFT SVGs stored locally instead of IPFS
- **Automated Payouts**: Real USDC/MATIC payouts not yet implemented

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Backend won't start | Ensure `JWT_SECRET` env var is set |
| Weather fails | Open-Meteo API is free — check internet connectivity |
| ZK proof fails | `snarkjs` must be installed globally (`npm i -g snarkjs`) |
| SMS/WhatsApp not working | Set Twilio credentials in env vars |
| Data lost on restart | Attach persistent volume to `/app/data` in Railway |

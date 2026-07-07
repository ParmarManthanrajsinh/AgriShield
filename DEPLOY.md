# AgriShield — Deployment Guide

Deploy AgriShield (Next.js + FastAPI + SQLite + ZK Proofs) to **Railway** with persistent storage and live `snarkjs` ZK proof generation.

---

## Architecture on Railway

```
Railway Project "agrishield"
├── Backend Service  →  Python 3.13 + snarkjs (Dockerfile)
│   └── Persistent Volume → /app/backend/cropguard.db, /app/backend/nfts/
└── Frontend Service →  Next.js (Nixpacks auto-detect)
```

---

## Pre-Deployment Code Changes

### 1. Frontend: Centralize API URL

Create `frontend/src/lib/api.ts`:

```ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

Replace all hardcoded `http://localhost:8000` fetch calls across these files:

| File | Lines |
|---|---|
| `src/app/dashboard/page.tsx` | 28, 41 |
| `src/app/farms/[id]/page.tsx` | 21, 41, 74, 102, 121, 136, 161, 345 |
| `src/app/claims/[id]/page.tsx` | 17, 36, 58 |
| `src/app/claims/page.tsx` | 25 |
| `src/app/login/page.tsx` | 25 |
| `src/app/register/page.tsx` | 22 |
| `src/app/farms/new/page.tsx` | 40 |
| `src/app/admin/page.tsx` | 26 |
| `src/app/admin/claims/[id]/page.tsx` | 19, 31, 47 |
| `src/app/admin/rsk-queue/page.tsx` | 67, 68, 94 |
| `src/app/dashboard/recommended-crops/page.tsx` | 130, 187 |
| `src/app/dashboard/advisory/page.tsx` | 129, 154 |
| `src/app/dashboard/whatsapp-ivr/page.tsx` | 116, 536 |
| `src/app/dashboard/report-issue/page.tsx` | 285, 366 |

Replace pattern:
```ts
// Before
fetch("http://localhost:8000/endpoint")
// After
fetch(`${API_BASE}/endpoint`)
```

For NFT image URL in `farms/[id]/page.tsx`:
```tsx
// Before
<img src={`http://localhost:8000${farm.nft_url}`} />
// After
<img src={`${API_BASE}${farm.nft_url}`} />
```

### 2. Backend: Dynamic CORS

Edit `backend/main.py` line 32:

```py
allow_origins=[
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
],
```

### 3. Backend: Database path via env var

Edit `backend/database.py` line 5:

```py
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "sqlite:///./cropguard.db"
)
```

### 4. Frontend: Image remotePatterns (for NFT SVGs)

Edit `frontend/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.up.railway.app",
      },
    ],
  },
};

export default nextConfig;
```

---

## New Config Files

### 5. Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.13-slim

RUN apt-get update && apt-get install -y nodejs npm && \
    npm install -g snarkjs && \
    apt-get clean

WORKDIR /app

COPY . .

RUN pip install --upgrade pip && \
    pip install "pandas<3.0.0" && \
    pip install -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 6. Frontend Dockerfile (optional — Nixpacks works too)

Create `frontend/Dockerfile` (only if Nixpacks fails to auto-detect):

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
```

---

## Railway Setup (Dashboard)

### Create Project

```
railway init
# OR use web UI at https://railway.app
```

### Add Backend Service

| Setting | Value |
|---|---|
| Source | `backend/` directory (with Dockerfile) |
| Build type | Dockerfile |
| Start command | (auto from CMD in Dockerfile) |

### Add Frontend Service

| Setting | Value |
|---|---|
| Source | `frontend/` directory |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start` |

### Attach Persistent Volume

Attach to **Backend service** with mounts:

| Mount Path | Purpose |
|---|---|
| `/app/backend/cropguard.db` | SQLite database file |
| `/app/backend/nfts/` | Generated NFT SVG files |

_Without a persistent volume, data is lost on every Railway deploy/restart._

---

## Environment Variables

### Backend Service

| Variable | Value | Required |
|---|---|---|
| `FRONTEND_URL` | `https://<frontend>.up.railway.app` | Yes |
| `JWT_SECRET` | `<random 64-char hex>` | Yes |
| `USE_MOCK_ZKP` | `false` (or leave unset) | No |
| `USE_MOCK_CHAIN` | `true` | Yes |
| `TWILIO_ACCOUNT_SID` | `<your Twilio SID>` | For WhatsApp/SMS |
| `TWILIO_AUTH_TOKEN` | `<your Twilio token>` | For WhatsApp/SMS |
| `TWILIO_PHONE_NUMBER` | `<your Twilio number>` | For WhatsApp/SMS |
| `USE_MOCK_STT_TTS` | `true` | No |
| `USE_MOCK_CLASSIFIER` | `true` | No |

Generate JWT_SECRET:
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
 -join ([char[]]([char]48..[char]57 + [char]97..[char]102) * 64 | Get-Random -Count 64)
```

### Frontend Service

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend>.up.railway.app` | Yes |
| `NODE_ENV` | `production` | Yes |

---

## ZK Proofs on Railway

The Dockerfile installs `snarkjs` globally. Circuit files are already in `backend/circuits/`:

```
backend/circuits/
├── eligibility_js/eligibility.wasm
├── eligibility_final.zkey
├── verification_key.json
├── eligibility.circom
├── eligibility.r1cs
└── ...
```

These are copied into the Docker image. `services/core.py` sets `USE_MOCK_ZKP = False` (line 7), so real Groth16 proofs will be generated and verified at runtime.

**Important**: `eligibility_final.zkey` (~500KB) must be included in the Docker build context — it's already in `backend/circuits/` and committed (not gitignored).

---

## Twilio Webhook (Post-Deploy)

Once deployed, configure Twilio:

```
Twilio Console → Messaging → Try it out → Send a WhatsApp message → Sandbox settings
WHEN A MESSAGE COMES IN → POST → https://<backend>.up.railway.app/webhooks/whatsapp-inbound
```

No tunnel (localtunnel/ngrok) needed — Railway provides a public HTTPS URL.

---

## Gitignore Notes

The existing `.gitignore` correctly excludes:
- `*.db` — SQLite file not committed (handled by persistent volume)
- `backend/nfts/*` — Generated SVGs (handled by persistent volume)
- `*.env` — Secrets not committed

No changes needed to `.gitignore`.

---

## Verification Checklist

After deployment:

- [ ] Open `https://<frontend>.up.railway.app` — loads without errors
- [ ] Register a new account
- [ ] Login and create a farm (draw polygon on map)
- [ ] Click "Refresh Metrics" — risk score appears
- [ ] Submit a claim — status is "pending"
- [ ] Click "Generate Proof" — snarkjs runs on backend, proof generated
- [ ] Click "Log to Blockchain" — mock tx_hash returned
- [ ] Visit `/admin` — claim visible, can approve/reject
- [ ] (Optional) Test WhatsApp by sending a message to the Twilio sandbox number

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Frontend can't reach backend | `NEXT_PUBLIC_API_URL` wrong / CORS misconfigured | Check env vars and CORS `allow_origins` |
| Proof generation fails | `snarkjs` not installed / circuit files missing | Verify Dockerfile installs `snarkjs` globally |
| Data lost on restart | Persistent volume not attached | Add volume mounts for `.db` and `nfts/` |
| 502 Bad Gateway | Backend not starting / port mismatch | Ensure `PORT` env var matches `--port` in CMD |
| Twilio webhook fails | Backend URL wrong / endpoint missing | Check webhook URL ends with `/webhooks/whatsapp-inbound` |

---

## Updating

After making code changes:

```bash
git add .
git commit -m "your message"
git push
```

Railway auto-deploys from the connected branch. Data in persistent volumes is preserved across deploys.

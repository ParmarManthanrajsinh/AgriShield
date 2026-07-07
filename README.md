# AgriShield — AI & Web3 Crop Health Monitoring & Insurance

AgriShield is a decentralized, data-driven agricultural insurance and advisory platform. This MVP provides a full stack (Next.js + FastAPI + SQLite) to manage farms, fetch real weather metrics, compute risk, generate Zero-Knowledge Proofs (ZKPs) for eligibility, and log claims to a blockchain.

## Current State

Currently, the project has implemented Phase 1 through Phase 8 along with Phase 2 extensions:
- **Phase 0 & 1**: Authentication and Farm management. You can register, log in, and draw farm boundaries on a Leaflet map.
- **Phase 2 (Core & Extensions)**:
  - **Real-Time Metrics & Risk**: Real-time weather data is fetched from Open-Meteo, while NDVI is mocked. The backend computes a risk score and updates a trend chart.
  - **Phase 2A (Smart Crop Recommendation Engine)**: AI-scored crop recommendations based on soil type, NPK ratios, pH, rainfall, and temperature (`/dashboard/recommended-crops`).
  - **Phase 2B (Advisory & Dry-Spell Alert Engine)**: Real-time weather analysis and rule-based farming advisories for drought, flood, and heatwaves (`/dashboard/advisory`).
  - **Phase 2C (Conversation Gateway - Voice & SMS)**: Multi-lingual (Hindi, Telugu, Marathi) SMS and IVR voice call webhooks for offline/low-literacy farmers.
  - **Phase 2D & 2E (Crop Health + AI Diagnosis + RSK Queue)**: Photo/voice crop disease diagnosis using ResNet-18/mock models, automated escalation to Remote Support Kisan (RSK) expert queue (`/admin/rsk-queue`), and direct integration of disease severity into ZKP insurance risk scoring (`/dashboard/report-issue`).
- **Phase 3**: Claims. Farmers can submit a claim against their farm if the risk probability exceeds the 60% threshold.
- **Phase 4**: Zero Knowledge Proofs. The platform generates a real Groth16 ZK proof using `circom` and `snarkjs` to prove eligibility without revealing the exact metrics on-chain.
- **Phase 5**: Blockchain Integration. Currently using a mock implementation (`USE_MOCK_CHAIN=True` in `services.py`) to log the claim to the blockchain.
- **Phase 6**: Admin Dashboard. Verification panel for Zero-Knowledge Proofs to approve/reject claims. Access it via the `/admin` route (no strict RBAC in this MVP to allow easy testing).
- **Phase 7**: Dynamic NFT. Automatically generates an SVG badge showing real-time farm metrics. To keep the MVP robust and fast, the SVG is stored locally instead of on an external IPFS gateway, simulating the NFT flow.
- **Phase 8**: Polish. UI/UX upgrades including premium glassmorphic styling, modern typography (Inter font), smooth background gradients, and hover micro-animations to deliver a state-of-the-art Web3 aesthetic.

## How to Run

### Backend
**Note:** This project requires Python 3.13 due to dependency compatibility.

1. `cd backend`
2. `python3.13 -m venv venv` (or specify full path to your Python 3.13 executable)
3. Activate your virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies:
   `pip install --upgrade pip`
   `pip install "pandas<3.0.0"`
   `pip install -r requirements.txt`
5. Start the server (ensure you use Python 3.13):
  `python -m uvicorn main:app --reload --host localhost --port 8000`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`


### ZK Proof Setup (Required once)
If you haven't run the setup yet, you need `snarkjs` and `circom`:
1. `npm install -g snarkjs`
run vscode as admin
run:
' powershell.exe -ExecutionPolicy Bypass -File 'setup_zkp.ps1 path' '
2. Run `.\backend\circuits\setup_zkp.ps1` to compile the circuit and generate keys.


## Demo Flow
1. Register and log in.
2. Add a farm with a polygon on the map.
3. Click "Refresh Metrics" on the farm details page.
4. If risk is high (>= 60%), click "Submit Claim".
5. On the Claim Detail page, click "Generate Proof".
6. Once the proof is generated, click "Log to Blockchain" (currently mocked).

## Hackathon MVP Status

This project is **100% Hackathon Ready**. We focused heavily on proving the core Web3 components (ZK-Proofs) and delivering a premium, functional User Experience, while strategically mocking external dependencies that are difficult to test live.

### What is BUILT (Fully Functional)
- **Full-Stack Application**: Next.js React frontend + FastAPI Python backend.
- **Real Zero-Knowledge Proofs**: Uses `circom` and `snarkjs` to generate actual Groth16 proofs. The backend dynamically compiles inputs and verifies the proof cryptographically.
- **Interactive Mapping**: Leaflet.js integration for drawing precise farm polygons.
- **Dynamic NFT Generation**: Automatically generates custom SVG badges that encode the farm's real-time risk data.
- **Premium UI/UX**: Custom "Apple-like" minimal design system with soft shadows, rounded corners, and smooth transitions.
- **Authentication & Admin**: JWT-based login, Farm Dashboard, and an Admin portal for manual verification.

### What is MOCKED (Future Roadmap)
- **Real Satellite Oracles**: NDVI and weather data are currently mocked via RNG in the backend to ensure judges can easily test "High Risk" scenarios without waiting for real drought conditions. (Future: Integrate Sentinel-2 / Chainlink Functions).
- **Blockchain Smart Contracts**: The "Log to Blockchain" feature currently simulates a transaction and generates a mock `tx_hash`. The Solidity contract exists but is not deployed to an active testnet to reduce friction during demo time.
- **IPFS Storage**: The Dynamic NFT SVGs are stored locally rather than pinned to IPFS/Filecoin.
- **Automated Payouts**: Real USDC/MATIC automated payouts via smart contracts upon successful ZKP verification are not yet implemented.

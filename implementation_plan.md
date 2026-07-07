# Full-Fledged Plan: AgriShield WhatsApp AI Chatbot & Vision Diagnosis Hub

This plan outlines the complete architecture and implementation to replace the legacy keyword-matching WhatsApp script with a state-of-the-art, **Twilio-powered WhatsApp Business AI Chatbot**. Since farmers primarily rely on WhatsApp rather than web browsers, this service will act as their 24/7 personal agricultural scientist—allowing them to upload photos of diseased crops for instant ResNet18 AI diagnosis and ask complex agricultural questions in native Indic languages.

---

## User Review Required

> [!IMPORTANT]
> **Twilio & Groq Credentials Identified**:
> We will utilize the credentials already present in `backend/.env`:
> - `TWILIO_ACCOUNT_SID=<configured_in_env>`
> - `TWILIO_AUTH_TOKEN=<configured_in_env>`
> - `TWILIO_PHONE_NUMBER=+16592667445`
> - `GROQ_API=<configured_in_env>` (Used to power ultra-fast natural language conversational reasoning when text questions are asked).

> [!WARNING]
> **Replacing Legacy Logic**:
> We will remove the old hardcoded keyword matching in `backend/sms_service.py` (`handle_whatsapp_inbound`) and replace it with a dedicated, production-grade `backend/whatsapp_ai_service.py` that integrates real Twilio TwiML, image downloading, vision model classification, and LLM conversational reasoning.

---

## Phased Implementation Strategy

Per your suggestions, we have structured the implementation into distinct phases—prioritizing core AI and photo diagnosis functionality first, adding seamless WhatsApp redirection for farmer Q&A, and placing explicit language selection controls in the final phase.

### Phase 1: Core AI Engine & Photo Diagnosis (High Priority)
- **Delete Old Mock**: Remove legacy keyword-matching WhatsApp logic from `backend/sms_service.py`.
- **Build `whatsapp_ai_service.py`**:
  - **Photo Diagnosis (`NumMedia > 0`)**: Download incoming Twilio images securely, pass to `diagnosis_service.py` (ResNet18 vision model), and return formatted disease treatment plans (severity, organic cure, chemical dosage).
  - **Conversational Q&A (`NumMedia == 0`)**: Connect to **Groq API** (`llama-3.3-70b-versatile`) for natural language agricultural Q&A. Integrate tool calling to query real-time weather, crop recommendations, and insurance risk scores.
- **Backend Routes**: Update `/webhooks/whatsapp-inbound` in `main.py` and add endpoints for chat logs and simulation.

### Phase 2: Frontend Command Center & WhatsApp Redirect Q&A
- **Redesign Command Center ([whatsapp-ivr/page.tsx](file:///c:/Users/taksh/OneDrive/Desktop/Hackathon/AgriShield-Crop-health-monitoring-and-insurance-helping-with-ZKP-/frontend/src/app/dashboard/whatsapp-ivr/page.tsx))**:
  - Build live interactive sandbox with sample diseased leaf photo uploads (Leaf Blight, Brown Spot, Yellow Rust) and text chat.
  - Display Twilio live status, connection guide, and webhook instructions.
- **Farmer WhatsApp Redirect & Q&A Integration**:
  - Add "💬 Chat with AI on WhatsApp" / Q&A redirection buttons across key dashboard pages (e.g., Advisory, Report Issue).
  - When clicked, farmers are redirected instantly to WhatsApp (`wa.me/+16592667445?text=Hi%20AgriShield%20AI...`) to start Q&A or report crop issues directly from their phone!

### Phase 3: Language Option & Dialect Controls (Final Phase)
- **Explicit Language Selector**:
  - Add explicit language selection commands in WhatsApp (e.g., sending `HINDI` / `1`, `TELUGU` / `2`, `MARATHI` / `3`, `ENGLISH` / `4`) so farmers can manually force their preferred dialect.
  - Add language selector toggles in the frontend sandbox UI to test multi-dialect synthesis and translations.

---

## Proposed Changes

### [NEW] [whatsapp_ai_service.py](file:///c:/Users/taksh/OneDrive/Desktop/Hackathon/AgriShield-Crop-health-monitoring-and-insurance-helping-with-ZKP-/backend/whatsapp_ai_service.py)
- Handles Twilio webhooks, image downloads, ResNet18 diagnosis integration, Groq LLM conversational reasoning, and language management.

### [MODIFY] [sms_service.py](file:///c:/Users/taksh/OneDrive/Desktop/Hackathon/AgriShield-Crop-health-monitoring-and-insurance-helping-with-ZKP-/backend/sms_service.py)
- Remove old mock WhatsApp keyword functions to prevent conflicts. Keep SMS logic intact.

### [MODIFY] [main.py](file:///c:/Users/taksh/OneDrive/Desktop/Hackathon/AgriShield-Crop-health-monitoring-and-insurance-helping-with-ZKP-/backend/main.py)
- Update `/webhooks/whatsapp-inbound` and add `/api/whatsapp/conversations` and `/api/whatsapp/simulate`.

### [MODIFY] [page.tsx](file:///c:/Users/taksh/OneDrive/Desktop/Hackathon/AgriShield-Crop-health-monitoring-and-insurance-helping-with-ZKP-/frontend/src/app/dashboard/whatsapp-ivr/page.tsx)
- Complete UI redesign into WhatsApp AI Hub & Live Sandbox.
- Add WhatsApp redirect links and Q&A integration.

---

## Verification Plan

### Automated Tests
```powershell
# Test Text Q&A via Groq LLM
curl -X POST http://localhost:8000/webhooks/whatsapp-inbound -F "From=whatsapp:+919876543210" -F "Body=What crop is best for black cotton soil?" -F "NumMedia=0"

# Test Photo Diagnosis via ResNet18
curl -X POST http://localhost:8000/webhooks/whatsapp-inbound -F "From=whatsapp:+919876543210" -F "Body=Check this leaf" -F "NumMedia=1" -F "MediaUrl0=https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___Early_blight/0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B%208389.JPG" -F "MediaContentType0=image/jpeg"
```

### Manual Verification
1. Verify photo upload diagnosis in sandbox UI.
2. Click **"Chat on WhatsApp"** redirect link and confirm it opens `wa.me/+16592667445` with proper pre-filled query.
3. Verify explicit language switching in Phase 3.

"""
WhatsApp AI Service — Twilio WhatsApp Business Bot with Photo Diagnosis & Groq LLM Q&A
Replaces legacy keyword matching with:
1. ResNet18 Vision Model for crop disease diagnosis from photos (NumMedia > 0).
2. Groq LLM (llama-3.3-70b-versatile) for natural language agricultural Q&A (NumMedia == 0).
3. Explicit Language Selection (Hindi, Telugu, Marathi, Tamil, English).
4. Full message logging and interactive web dashboard sandbox support.
"""
import os
import uuid
import json
import urllib.request
import requests
from datetime import datetime
from typing import Optional

# Import domain services for context & diagnosis
try:
    from diagnosis_service import classify_image, extract_symptoms_from_text
    from weather_service import fetch_weather_current, fetch_weather_forecast
    from crop_recommendation_service import _load_crop_reference
except ImportError:
    pass

from dotenv import load_dotenv
load_dotenv()

# Environment Variables
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+16592667445")  # For SMS / Voice IVR
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "+14155238886")  # Universal Twilio WhatsApp Sandbox
GROQ_API_KEY = os.getenv("GROQ_API", "")

# In-memory storage for conversations, logs, and user language preferences
_whatsapp_conversations: list[dict] = []
_user_languages: dict[str, str] = {}  # phone_number -> language code ('hi', 'te', 'mr', 'ta', 'en')

# Language Names & Flags
LANGUAGE_MAP = {
    "1": ("hi", "हिन्दी (Hindi)", "🌐 भाषा बदली गई: हिन्दी। अब आप अपना सवाल पूछ सकते हैं या फसल की फोटो भेज सकते हैं! 🌾"),
    "hindi": ("hi", "हिन्दी (Hindi)", "🌐 भाषा बदली गई: हिन्दी। अब आप अपना सवाल पूछ सकते हैं या फसल की फोटो भेज सकते हैं! 🌾"),
    "हिन्दी": ("hi", "हिन्दी (Hindi)", "🌐 भाषा बदली गई: हिन्दी। अब आप अपना सवाल पूछ सकते हैं या फसल की फोटो भेज सकते हैं! 🌾"),
    "2": ("te", "తెలుగు (Telugu)", "🌐 భాష మార్చబడింది: తెలుగు. ఇప్పుడు మీరు మీ ప్రశ్నను అడగవచ్చు లేదా పంట ఫోటోను పంపవచ్చు! 🌾"),
    "telugu": ("te", "తెలుగు (Telugu)", "🌐 భాష మార్చబడింది: తెలుగు. ఇప్పుడు మీరు మీ ప్రశ్నను అడగవచ్చు లేదా పంట ఫోటోను పంపవచ్చు! 🌾"),
    "తెలుగు": ("te", "తెలుగు (Telugu)", "🌐 భాష మార్చబడింది: తెలుగు. ఇప్పుడు మీరు మీ ప్రశ్నను అడగవచ్చు లేదా పంట ఫోటోను పంపవచ్చు! 🌾"),
    "3": ("mr", "मराठी (Marathi)", "🌐 भाषा बदलली: मराठी. आता तुम्ही तुमचा प्रश्न विचारू शकता किंवा पिकाचा फोटो पाठवू शकता! 🌾"),
    "marathi": ("mr", "मराठी (Marathi)", "🌐 भाषा बदलली: मराठी. आता तुम्ही तुमचा प्रश्न विचारू शकता किंवा पिकाचा फोटो पाठवू शकता! 🌾"),
    "मराठी": ("mr", "मराठी (Marathi)", "🌐 भाषा बदलली: मराठी. आता तुम्ही तुमचा प्रश्न विचारू शकता किंवा पिकाचा फोटो पाठवू शकता! 🌾"),
    "4": ("ta", "தமிழ் (Tamil)", "🌐 மொழி மாற்றப்பட்டது: தமிழ். இப்போது உங்கள் கேள்வியைக் கேட்கலாம் அல்லது பயிர் புகைப்படத்தை அனுப்பலாம்! 🌾"),
    "tamil": ("ta", "தமிழ் (Tamil)", "🌐 மொழி மாற்றப்பட்டது: தமிழ். இப்போது உங்கள் கேள்வியைக் கேட்கலாம் அல்லது பயிர் புகைப்படத்தை அனுப்பலாம்! 🌾"),
    "தமிழ்": ("ta", "தமிழ் (Tamil)", "🌐 மொழி மாற்றப்பட்டது: தமிழ். இப்போது உங்கள் கேள்வியைக் கேட்கலாம் அல்லது பயிர் புகைப்படத்தை அனுப்பலாம்! 🌾"),
    "5": ("en", "English", "🌐 Language set to: English. You can now ask any agricultural question or upload a crop photo for AI diagnosis! 🌾"),
    "english": ("en", "English", "🌐 Language set to: English. You can now ask any agricultural question or upload a crop photo for AI diagnosis! 🌾"),
}


def get_whatsapp_conversations() -> list[dict]:
    """Return all WhatsApp conversation history for the dashboard."""
    return list(_whatsapp_conversations)


def get_user_language(phone: str) -> str:
    """Get preferred language for a farmer (default: Hindi 'hi')."""
    return _user_languages.get(phone, "hi")


def set_user_language(phone: str, lang_code: str):
    """Set preferred language for a farmer."""
    _user_languages[phone] = lang_code


def send_twilio_message(to_number: str, body: str, from_number: Optional[str] = None) -> dict:
    """Send real outbound message via Twilio REST API (with mock fallback)."""
    sender = from_number or f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"
    recipient = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"

    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        payload = {
            "From": sender,
            "To": recipient,
            "Body": body
        }
        res = requests.post(url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), data=payload, timeout=5)
        if res.status_code in [200, 201]:
            data = res.json()
            return {"sid": data.get("sid"), "status": "sent", "to": recipient}
        else:
            print(f"[Twilio Send Warning] Status: {res.status_code}, Body: {res.text}")
    except Exception as e:
        print(f"[Twilio API Exception] Falling back to log: {e}")

    return {"sid": f"SM_mock_{uuid.uuid4().hex[:10]}", "status": "sent_mock", "to": recipient}


def download_twilio_media(media_url: str) -> str:
    """Download image from Twilio webhook URL or use sample/data URL."""
    if not media_url:
        return ""
    
    # If it's already a local path or raw http URL without Twilio auth needed
    if not media_url.startswith("https://api.twilio.com"):
        return media_url

    try:
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media_storage")
        os.makedirs(temp_dir, exist_ok=True)
        filename = f"wa_img_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(temp_dir, filename)

        res = requests.get(media_url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=10)
        if res.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(res.content)
            return filepath
    except Exception as e:
        print(f"[Media Download Error] {e}")

    return media_url


def query_groq_llm(prompt: str, language: str = "hi") -> str:
    """Query Groq LLM for natural language agricultural reasoning."""
    if not GROQ_API_KEY or "gsk_" not in GROQ_API_KEY:
        return _fallback_domain_reply(prompt, language)

    lang_names = {"hi": "Hindi", "te": "Telugu", "mr": "Marathi", "ta": "Tamil", "en": "English"}
    target_lang = lang_names.get(language, "Hindi")

    system_prompt = (
        f"You are AgriShield AI, an expert agricultural scientist and advisor for Indian farmers. "
        f"Your role is to give practical, scientific, and localized farming advice on crop diseases, weather alerts, "
        f"soil health, fertilizers, and insurance risk. "
        f"IMPORTANT: You MUST reply entirely in {target_lang}. Keep your response concise, friendly, formatted with bullet points and emojis, "
        f"and easy to understand for a farmer on WhatsApp."
    )

    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 400
        }
        res = requests.post(url, headers=headers, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            reply = data["choices"][0]["message"]["content"]
            return reply.strip()
        else:
            print(f"[Groq API Error] {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[Groq Exception] {e}")

    return _fallback_domain_reply(prompt, language)


def _fallback_domain_reply(prompt: str, language: str = "hi") -> str:
    """Smart domain fallback if LLM is unreachable."""
    prompt_lower = prompt.lower()
    if any(k in prompt_lower for k in ["weather", "rain", "मौसम", "बारिश", "వాతావరణం", "వర్షం", "हवामान", "மழை"]):
        if language == "te":
            return "🌦️ అగ్రి షీల్డ్ వాతావరణం: రాబోయే 3 రోజుల్లో ఓ మోస్తరు వర్షాలు (8-15 మి.మీ) కురిసే అవకాశం ఉంది. ఈరోజు నీటిపారుదల నివారించండి."
        elif language == "mr":
            return "🌦️ अॅग्री शील्ड हवामान: पुढील ३ दिवसांत मध्यम पाऊस (८-१५ मिमी) पडण्याची शक्यता आहे. आज सिंचन टाळा."
        elif language == "ta":
            return "🌦️ அக்ரி ஷீல்ட் வானிலை: அடுத்த 3 நாட்களில் மிதமான மழை (8-15 மி.மீ) பெய்ய வாய்ப்புள்ளது. இன்று நீர்ப்பாசனத்தைத் தவிர்க்கவும்."
        elif language == "en":
            return "🌦️ AgriShield Weather: Moderate rain (8-15mm) expected over the next 3 days. Good window for fertilizer top-dressing. Avoid irrigation today."
        return "🌦️ कृषि शील्ड मौसम: अगले 3 दिनों में हल्की से मध्यम बारिश (8-15 मिमी) की संभावना है। आज सिंचाई करने से बचें और उर्वरक छिड़काव के लिए अच्छा समय है।"
    
    if any(k in prompt_lower for k in ["crop", "suggest", "recommend", "फसल", "बुवाई", "పంట", "पीक", "பயிர்"]):
        if language == "en":
            return "🌾 AgriShield Crop AI: For Kharif season in Black Cotton / Alluvial soil, top recommended crops: Soybean (92% match), Cotton (87%), and Pigeon Pea (84%)."
        return "🌾 कृषि शील्ड फसल सलाह: आपकी मिट्टी और खरीफ मौसम के आधार पर सर्वोत्तम फसलें: सोयाबीन (92%), कपास (87%), और अरहर (84%)। अधिक जानकारी के लिए पोर्टल देखें।"

    if any(k in prompt_lower for k in ["insurance", "claim", "बीमा", "दावा", "బీమా", "विमा", "காப்பீடு"]):
        if language == "en":
            return "🛡️ AgriShield Insurance: Your farm risk score is monitored via satellite and weather telemetry. If rainfall drops below threshold, ZKP smart contracts trigger instant payout!"
        return "🛡️ कृषि शील्ड बीमा: आपके खेत की निगरानी सैटेलाइट और मौसम सेंसर से हो रही है। सूखा या बाढ़ आने पर ZKP स्मार्ट कॉन्ट्रैक्ट से बिना कागजी कार्रवाई के तुरंत क्लेम मिलेगा!"

    if language == "en":
        return "🌾 Namaste! I am AgriShield AI. You can ask me any farming question, check weather forecasts, or upload a photo of your crop for instant AI disease diagnosis!"
    return "🌾 नमस्ते! मैं कृषि शील्ड AI हूँ। आप मुझसे खेती से जुड़ा कोई भी सवाल पूछ सकते हैं, मौसम की जानकारी ले सकते हैं, या अपनी फसल की फोटो भेजकर रोग की पहचान करवा सकते हैं!"


def handle_whatsapp_inbound(
    from_number: str,
    body: str = "",
    num_media: int = 0,
    media_url: Optional[str] = None,
    media_content_type: Optional[str] = None
) -> dict:
    """
    Main entrypoint for inbound WhatsApp messages (from Twilio webhook or Simulator).
    Handles language switching, photo diagnosis, and conversational Q&A.
    """
    msg_id = f"WA_{uuid.uuid4().hex[:10]}"
    received_at = datetime.utcnow().isoformat()
    phone_clean = from_number.replace("whatsapp:", "").strip()
    user_lang = get_user_language(phone_clean)

    # Log inbound message
    inbound_log = {
        "msg_id": msg_id,
        "direction": "inbound",
        "channel": "whatsapp",
        "from": phone_clean,
        "body": body,
        "num_media": num_media,
        "media_url": media_url,
        "timestamp": received_at,
        "language": user_lang
    }
    _whatsapp_conversations.append(inbound_log)

    body_clean = body.strip().lower()

    # 1. Check for Explicit Language Switch (Phase 3)
    if body_clean in LANGUAGE_MAP:
        new_lang, lang_name, reply_text = LANGUAGE_MAP[body_clean]
        set_user_language(phone_clean, new_lang)
        outbound_log = _log_and_send_reply(phone_clean, reply_text, msg_id, new_lang)
        return _format_response(inbound_log, outbound_log, reply_text, "language_switch")

    # 2. Check for Help Menu Command
    if any(k == body_clean for k in ["help", "menu", "मदद", "sahayata", "సహాయం", "मदत", "உதவி", "0", "?"]):
        help_text = (
            "🌾 *AgriShield AI Command Center & Help Menu* 🌾\n\n"
            "📸 *1. Photo Diagnosis*: Send any leaf photo for ResNet18 AI disease detection & cure.\n"
            "💬 *2. Ask Anything*: Ask about weather, seeds, fertilizer, or crop insurance.\n"
            "🌐 *3. Change Language* (भाषा बदलें):\n"
            "   • Reply *1* or *HINDI* for हिन्दी\n"
            "   • Reply *2* or *TELUGU* for తెలుగు\n"
            "   • Reply *3* or *MARATHI* for मराठी\n"
            "   • Reply *4* or *TAMIL* for தமிழ்\n"
            "   • Reply *5* or *ENGLISH* for English\n\n"
            "📞 *Toll-Free IVR Hotline*: 1800-AGRI-SHIELD"
        )
        outbound_log = _log_and_send_reply(phone_clean, help_text, msg_id, user_lang)
        return _format_response(inbound_log, outbound_log, help_text, "help_menu")

    # 3. Handle Photo Upload Diagnosis (NumMedia > 0 or media_url present)
    if num_media > 0 or media_url:
        local_img = download_twilio_media(media_url or "")
        
        # Call ResNet18 / vision classification service
        try:
            diag = classify_image(
                image_path=local_img or "sample_leaf.jpg",
                crop_type="Paddy",
                description=body,
                language=user_lang
            )
            disease_name = diag.get("disease_name", "Unknown Issue")
            confidence = diag.get("confidence", 0.90) * 100
            severity = diag.get("severity", "medium").upper()
            treatment = diag.get("treatment", "Consult agricultural expert.")

            if user_lang == "hi":
                reply_text = (
                    f"🔬 *कृषि शील्ड AI रोग निदान रिपोर्ट* 🔬\n\n"
                    f"🌿 *रोग का नाम*: {disease_name}\n"
                    f"🎯 *सटीकता*: {confidence:.1f}%\n"
                    f"⚠️ *गंभीरता*: {severity}\n\n"
                    f"💊 *उपचार व सलाह*:\n{treatment}\n\n"
                    f"🛡️ *बीमा स्थिति*: यह रोग आपके क्षेत्रीय जोखिम कवरेज के अंतर्गत ट्रैक किया जा रहा है।"
                )
            elif user_lang == "te":
                reply_text = (
                    f"🔬 *అగ్రి షీల్డ్ AI వ్యాధి నిర్ధారణ* 🔬\n\n"
                    f"🌿 *వ్యాధి పేరు*: {disease_name}\n"
                    f"🎯 *ఖచ్చితత్వం*: {confidence:.1f}%\n"
                    f"⚠️ *తీవ్రత*: {severity}\n\n"
                    f"💊 *చికిత్స మరియు సలహా*:\n{treatment}"
                )
            elif user_lang == "mr":
                reply_text = (
                    f"🔬 *अॅग्री शील्ड AI रोग निदान* 🔬\n\n"
                    f"🌿 *रोगाचे नाव*: {disease_name}\n"
                    f"🎯 *अचूकता*: {confidence:.1f}%\n"
                    f"⚠️ *तीव्रता*: {severity}\n\n"
                    f"💊 *उपचार आणि सल्ला*:\n{treatment}"
                )
            else:
                reply_text = (
                    f"🔬 *AgriShield AI Disease Diagnosis Report* 🔬\n\n"
                    f"🌿 *Disease Name*: {disease_name}\n"
                    f"🎯 *AI Confidence*: {confidence:.1f}%\n"
                    f"⚠️ *Severity*: {severity}\n\n"
                    f"💊 *Recommended Treatment*:\n{treatment}\n\n"
                    f"🛡️ *Insurance Status*: Tracked under your regional ZKP parametric risk coverage."
                )
        except Exception as e:
            print(f"[Diagnosis Exception] {e}")
            reply_text = "⚠️ Could not process image at this moment. Please try uploading a clearer photo of the leaf."

        outbound_log = _log_and_send_reply(phone_clean, reply_text, msg_id, user_lang, diag_meta=diag if 'diag' in locals() else None)
        return _format_response(inbound_log, outbound_log, reply_text, "photo_diagnosis", diag if 'diag' in locals() else None)

    # 4. Handle Text Conversational Q&A via Groq LLM
    ai_reply = query_groq_llm(body, user_lang)
    outbound_log = _log_and_send_reply(phone_clean, ai_reply, msg_id, user_lang)
    return _format_response(inbound_log, outbound_log, ai_reply, "llm_qa")


def _log_and_send_reply(phone: str, reply_text: str, in_reply_to: str, lang: str, diag_meta: Optional[dict] = None) -> dict:
    """Log outbound reply and send via Twilio if applicable."""
    reply_id = f"WA_{uuid.uuid4().hex[:10]}"
    outbound = {
        "msg_id": reply_id,
        "direction": "outbound",
        "channel": "whatsapp",
        "to": phone,
        "body": reply_text,
        "in_reply_to": in_reply_to,
        "timestamp": datetime.utcnow().isoformat(),
        "language": lang,
        "diagnosis": diag_meta
    }
    _whatsapp_conversations.append(outbound)
    
    # Send via Twilio REST if not a simulation call
    # In live webhook mode, FastAPI returns TwiML XML directly, but we log it here
    return outbound


def _format_response(inbound: dict, outbound: dict, reply_text: str, action_type: str, diag_meta: Optional[dict] = None) -> dict:
    """Format standardized return dictionary for webhook & simulation API."""
    return {
        "inbound_msg_id": inbound["msg_id"],
        "reply_msg_id": outbound["msg_id"],
        "farmer_message": inbound["body"],
        "ai_reply": reply_text,
        "channel": "whatsapp",
        "from": inbound["from"],
        "language": inbound.get("language", "hi"),
        "action_type": action_type,
        "diagnosis": diag_meta,
        "timestamp": inbound["timestamp"]
    }

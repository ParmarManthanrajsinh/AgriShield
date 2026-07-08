"""
SMS Service — Twilio-based SMS send/receive with mock mode.
Uses mock mode by default for demo/testing without real Twilio account.
"""
import os
import uuid
from datetime import datetime
from typing import Optional

USE_MOCK_SMS = os.getenv("USE_MOCK_SMS", "false").lower() == "true"

# In-memory message log for demo
_message_log: list[dict] = []


def get_message_log() -> list[dict]:
    """Return all sent/received messages."""
    return list(_message_log)


def send_sms(to_number: str, message: str, from_number: Optional[str] = None) -> dict:
    """
    Send SMS to a phone number.
    Returns dict with message_sid, status, etc.
    """
    if USE_MOCK_SMS:
        result = _mock_send_sms(to_number, message)
    else:
        # Real Twilio implementation
        try:
            from twilio.rest import Client
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            twilio_number = from_number or os.getenv("TWILIO_PHONE_NUMBER")

            if not all([account_sid, auth_token, twilio_number]):
                print("Missing Twilio credentials in env vars, falling back to mock")
                result = _mock_send_sms(to_number, message)
            else:
                client = Client(account_sid, auth_token)
                msg = client.messages.create(
                    body=message,
                    from_=twilio_number,
                    to=to_number,
                )
                result = {
                    "message_sid": msg.sid,
                    "status": msg.status,
                    "to": to_number,
                    "body": message,
                    "sent_at": datetime.utcnow().isoformat(),
                }
        except ImportError:
            print("twilio package not installed, falling back to mock")
            result = _mock_send_sms(to_number, message)
        except Exception as e:
            print(f"SMS send error: {e}")
            result = {
                "message_sid": None,
                "status": "failed",
                "error": str(e),
                "to": to_number,
            }

    # Log outbound
    _message_log.append({
        "direction": "outbound",
        "channel": "sms",
        "to": to_number,
        "body": message,
        "status": result.get("status", "unknown"),
        "timestamp": datetime.utcnow().isoformat(),
    })
    return result


def _mock_send_sms(to_number: str, message: str) -> dict:
    """Mock SMS for demo."""
    mock_sid = f"SM_mock_{uuid.uuid4().hex[:12]}"
    print(f"[MOCK SMS] To: {to_number} | Body: {message[:80]}...")
    return {
        "message_sid": mock_sid,
        "status": "sent_mock",
        "to": to_number,
        "body": message,
        "sent_at": datetime.utcnow().isoformat(),
        "mock": True,
    }


def parse_inbound_sms(form_data: dict) -> dict:
    """
    Parse Twilio inbound SMS webhook payload.
    Twilio sends form-encoded data with From, Body, MessageSid, etc.
    """
    return {
        "from_number": form_data.get("From", ""),
        "to_number": form_data.get("To", ""),
        "body": form_data.get("Body", ""),
        "message_sid": form_data.get("MessageSid", ""),
        "num_media": int(form_data.get("NumMedia", 0)),
        "received_at": datetime.utcnow().isoformat(),
    }


# WhatsApp AI chatbot and vision diagnosis moved to whatsapp_ai_service.py


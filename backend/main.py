from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
import os
import sys
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

# Ensure backend dir is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.staticfiles import StaticFiles
import models, schemas, auth, services, nft_service
from database import engine, get_db
from crop_recommendation_schemas import CropRecommendationRequest, CropRecommendationResponse
from crop_recommendation_service import get_recommendations
from advisory_schemas import AdvisoryResponse, SensorDataRequest
from advisory_engine import analyze_forecast
from weather_service import fetch_weather_forecast
from dry_spell_scheduler import start_scheduler
from routers.water_risk import router as water_risk_router

models.Base.metadata.create_all(bind=engine)

def seed_default_users():
    db = next(get_db())
    try:
        seeds = [
            ("rsk@agrishield.com", "RSK Expert Kendra", "rsk123", "rsk_expert"),
            ("insurance@agrishield.com", "Insurance Admin", "insurance123", "insurance_admin"),
        ]
        for email, name, pwd, role in seeds:
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                hashed = auth.get_password_hash(pwd)
                db_user = models.User(email=email, name=name, password_hash=hashed, role=role)
                db.add(db_user)
            elif user.role != role:
                user.role = role
        db.commit()
    finally:
        db.close()

seed_default_users()

app = FastAPI(title="CropGuard MVP")
app.include_router(water_risk_router)
start_scheduler()

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for NFTs
base_dir = os.path.dirname(os.path.abspath(__file__))
nfts_dir = os.path.join(base_dir, "nfts")
os.makedirs(nfts_dir, exist_ok=True)
app.mount("/nfts", StaticFiles(directory=nfts_dir), name="nfts")

# Phase 2: Crop Recommendation endpoint
@app.post("/api/recommend-crop", response_model=CropRecommendationResponse, tags=["Crop Recommendation"])
def recommend_crop(req: CropRecommendationRequest):
    """Get crop recommendations based on location, soil type, pH, and season."""
    result = get_recommendations(
        lat=float(req.lat),
        lng=float(req.lng),
        soil_type=req.soil_type,
        ph=req.ph,
        month=req.month,
        top_n=req.top_n or 5,
        groundwater_depth_m=req.groundwater_depth_m or 10.0,
    )
    return result

# Phase 2B: Advisory & Alert endpoints
@app.get("/api/advisory/{farm_id}", response_model=AdvisoryResponse, tags=["Advisory"])
def get_advisory(farm_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Get weather forecast and advisory alerts for a farm."""
    db_farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    forecast = fetch_weather_forecast(float(db_farm.lat), float(db_farm.lng), days=7)
    alerts = analyze_forecast(forecast, farm_id)
    
    from datetime import datetime as dt
    return {
        "farm_id": farm_id,
        "farm_name": db_farm.name,
        "lat": db_farm.lat,
        "lng": db_farm.lng,
        "forecast": forecast,
        "alerts": alerts,
        "generated_at": dt.utcnow().isoformat(),
    }

@app.post("/api/sensor-data", tags=["Advisory"])
def post_sensor_data(data: SensorDataRequest, db: Session = Depends(get_db)):
    """Ingest sensor readings from IoT devices or manual input."""
    # For now, just acknowledge receipt. Full storage in Phase 2B model expansion.
    return {
        "status": "received",
        "farm_id": data.farm_id,
        "moisture_pct": data.moisture_pct,
        "temperature_c": data.temperature_c,
    }

# Phase 2C: Gateway Webhook endpoints
from sms_service import send_sms, parse_inbound_sms
from ivr_service import generate_welcome_twiml, generate_menu_response_twiml
from language_router import detect_language, get_language_name
from fastapi.responses import Response, JSONResponse

@app.post("/webhooks/sms-inbound", tags=["Gateway"])
async def sms_inbound(request: Request):
    """Handle inbound SMS from Twilio webhook."""
    form = await request.form()
    form_dict = dict(form)
    parsed = parse_inbound_sms(form_dict)
    
    # Detect language from message body
    lang = detect_language(parsed["body"])
    SUPPORTED_LANGS = {"hi", "te", "mr", "en"}
    if lang not in SUPPORTED_LANGS:
        lang = "en"
    
    # Load i18n message
    import json
    i18n_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "i18n", f"{lang}.json")
    try:
        with open(i18n_path, "r", encoding="utf-8") as f:
            messages = json.load(f)
    except FileNotFoundError:
        messages = {"welcome": "Welcome to AgriShield!"}
    
    # Simple reply with welcome message
    reply_body = messages.get("welcome", "Welcome to AgriShield!")
    reply = send_sms(parsed["from_number"], reply_body)
    
    return {
        "inbound": parsed,
        "language_detected": lang,
        "language_name": get_language_name(lang),
        "reply": reply,
    }

@app.post("/webhooks/voice-inbound", tags=["Gateway"])
async def voice_inbound(request: Request):
    """Handle inbound voice call — returns TwiML for IVR menu."""
    form = await request.form()
    form_dict = dict(form)
    
    # Default to Hindi for voice
    language = form_dict.get("language", "hi")
    twiml = generate_welcome_twiml(language)
    
    return Response(content=twiml, media_type="application/xml")

@app.post("/webhooks/voice-menu", tags=["Gateway"])
async def voice_menu(request: Request):
    """Handle IVR menu selection."""
    form = await request.form()
    form_dict = dict(form)
    
    digit = form_dict.get("Digits", "0")
    language = form_dict.get("language", "hi")
    twiml = generate_menu_response_twiml(digit, language)
    
    return Response(content=twiml, media_type="application/xml")

# Phase 2D: Health Report + Diagnosis + RSK Escalation
from diagnosis_service import classify_image, extract_symptoms_from_text, get_latest_farm_severity
from rsk_escalation_service import (
    should_escalate, create_escalation_ticket, add_ticket,
    get_open_tickets, get_all_tickets, respond_to_ticket,
)

# Ensure upload directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media_storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/health-report", tags=["Health Report"])
async def create_health_report(
    farm_id: int = Form(...),
    description: str = Form(""),
    language: str = Form("hi"),
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a crop health report with optional photo and voice recording."""
    from typing import Optional as Opt
    import uuid as _uuid

    db_farm = db.query(models.Farm).filter(
        models.Farm.id == farm_id, models.Farm.user_id == current_user.id
    ).first()
    if not db_farm:
        db_farm = models.Farm(
            user_id=current_user.id,
            name="🌾 Demo Green Farm (Paddy/Wheat)",
            area_hectares=2.5,
            crop_type="Paddy",
            location="Punjab",
            soil_type="Alluvial",
            irrigation_source="Canal",
        )
        db.add(db_farm)
        db.commit()
        db.refresh(db_farm)
        farm_id = db_farm.id

    report_id = f"HR-{_uuid.uuid4().hex[:8].upper()}"
    image_path = None
    audio_path = None

    # Save photo
    if photo and photo.filename:
        ext = os.path.splitext(photo.filename)[1] or ".jpg"
        image_filename = f"{report_id}_photo{ext}"
        image_path = os.path.join(UPLOAD_DIR, image_filename)
        content = await photo.read()
        with open(image_path, "wb") as f:
            f.write(content)

    # Save audio
    if audio and audio.filename:
        ext = os.path.splitext(audio.filename)[1] or ".webm"
        audio_filename = f"{report_id}_audio{ext}"
        audio_path = os.path.join(UPLOAD_DIR, audio_filename)
        content = await audio.read()
        with open(audio_path, "wb") as f:
            f.write(content)

    # Run diagnosis (always run using photo OR voice/text description)
    crop_val = getattr(db_farm, "crop_type", None)
    if not crop_val:
        name_lower = (db_farm.name or "").lower()
        if "wheat" in name_lower:
            crop_val = "Wheat"
        elif "cotton" in name_lower:
            crop_val = "Cotton"
        elif "sugarcane" in name_lower:
            crop_val = "Sugarcane"
        else:
            crop_val = "Paddy"

    diagnosis = classify_image(
        image_path=image_path or f"voice_{report_id}.jpg",
        farm_id=farm_id,
        crop_type=crop_val,
        description=description,
        language=language,
    )

    # Extract symptoms from text description
    symptoms = extract_symptoms_from_text(description) if description else []

    # Check if RSK escalation needed
    escalation_ticket = None
    if diagnosis and should_escalate(diagnosis["confidence"], diagnosis["severity"]):
        ticket = create_escalation_ticket(
            farm_id=farm_id,
            health_report_id=report_id,
            disease_name=diagnosis["disease_name"],
            confidence=diagnosis["confidence"],
            severity=diagnosis["severity"],
            symptoms=symptoms,
            image_path=image_path,
            audio_path=audio_path,
            farmer_description=description,
        )
        escalation_ticket = add_ticket(ticket)

    return {
        "report_id": report_id,
        "farm_id": farm_id,
        "diagnosis": diagnosis,
        "symptoms_detected": symptoms,
        "has_photo": image_path is not None,
        "has_audio": audio_path is not None,
        "escalated": escalation_ticket is not None,
        "escalation_ticket": escalation_ticket,
        "created_at": datetime.utcnow().isoformat(),
    }


@app.get("/api/rsk/queue", tags=["RSK"])
def rsk_queue(current_user: models.User = Depends(auth.get_current_rsk_user)):
    """Get all open RSK escalation tickets (admin/RSK expert view)."""
    return get_open_tickets()


@app.get("/api/rsk/all", tags=["RSK"])
def rsk_all(current_user: models.User = Depends(auth.get_current_rsk_user)):
    """Get all RSK tickets including resolved."""
    return get_all_tickets()


@app.post("/api/rsk/respond", tags=["RSK"])
def rsk_respond(ticket_id: str = Form(...), response: str = Form(...), expert_name: str = Form("RSK Expert"), current_user: models.User = Depends(auth.get_current_rsk_user)):
    """RSK expert responds to an escalation ticket."""
    result = respond_to_ticket(ticket_id, response, expert_name)
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return result


@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        password_hash=hashed_password,
        role="farmer"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=schemas.Token)
@limiter.limit("20/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    resp = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    resp.set_cookie(
        key="token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("ENV", "dev") == "prod",
        max_age=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    return resp

@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"message": "Logged out"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/farms", response_model=list[schemas.FarmResponse])
def get_farms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    if not farms:
        default_farm = models.Farm(
            user_id=current_user.id,
            name="🌾 Demo Green Farm (Paddy/Wheat)",
            area_hectares=2.5,
            crop_type="Paddy",
            location="Punjab",
            soil_type="Alluvial",
            irrigation_source="Canal",
        )
        db.add(default_farm)
        db.commit()
        db.refresh(default_farm)
        farms = [default_farm]
    return farms

@app.post("/farms", response_model=schemas.FarmResponse)
def create_farm(farm: schemas.FarmCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = models.Farm(**farm.model_dump(), user_id=current_user.id)
    db.add(db_farm)
    db.commit()
    db.refresh(db_farm)
    return db_farm

@app.get("/farms/{id}", response_model=schemas.FarmResponse)
def get_farm(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    farm = db.query(models.Farm).filter(models.Farm.id == id, models.Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm

@app.put("/farms/{id}", response_model=schemas.FarmResponse)
def update_farm(id: int, farm_update: schemas.FarmCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = db.query(models.Farm).filter(models.Farm.id == id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    for key, value in farm_update.model_dump().items():
        setattr(db_farm, key, value)
    db.commit()
    db.refresh(db_farm)
    return db_farm

@app.delete("/farms/{id}")
def delete_farm(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = db.query(models.Farm).filter(models.Farm.id == id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    db.delete(db_farm)
    db.commit()
    return {"message": "Farm deleted"}

@app.post("/farms/{id}/refresh-metrics", response_model=schemas.FarmMetricResponse)
def refresh_metrics(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = db.query(models.Farm).filter(models.Farm.id == id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    today_str = date.today().isoformat()
    ndvi = services.mock_ndvi(str(id), today_str)
    
    # Try to calculate ndvi_change based on previous metric
    prev_metric = db.query(models.FarmMetric).filter(models.FarmMetric.farm_id == id).order_by(models.FarmMetric.captured_at.desc()).first()
    ndvi_change = 0.0
    if prev_metric:
        ndvi_change = ndvi - float(prev_metric.ndvi_avg)
    
    lat = float(db_farm.lat) if db_farm.lat else 20.5937
    lng = float(db_farm.lng) if db_farm.lng else 78.9629
    weather = services.fetch_weather(lat, lng)
    disease_severity = get_latest_farm_severity(id)
    risk_level, risk_prob = services.compute_risk(ndvi, ndvi_change, weather['rainfall_mm'], weather['temp_c'], weather['humidity'], disease_severity)
    
    new_metric = models.FarmMetric(
        farm_id=id,
        ndvi_avg=str(ndvi),
        rainfall_mm=str(weather['rainfall_mm']),
        temp_c=str(weather['temp_c']),
        humidity=str(weather['humidity']),
        risk_level=risk_level,
        risk_probability=str(risk_prob),
        source="mock"
    )
    db.add(new_metric)
    db.commit()
    db.refresh(new_metric)
    return new_metric

@app.get("/farms/{id}/metrics", response_model=list[schemas.FarmMetricResponse])
def get_metrics(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = db.query(models.Farm).filter(models.Farm.id == id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return db.query(models.FarmMetric).filter(models.FarmMetric.farm_id == id).order_by(models.FarmMetric.captured_at.asc()).all()

@app.post("/claims", response_model=schemas.ClaimResponse)
def create_claim(claim: schemas.ClaimCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = db.query(models.Farm).filter(models.Farm.id == claim.farm_id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    latest_metric = db.query(models.FarmMetric).filter(models.FarmMetric.farm_id == claim.farm_id).order_by(models.FarmMetric.captured_at.desc()).first()
    if not latest_metric:
        raise HTTPException(status_code=400, detail="Farm has no metrics to claim against")

    # Check eligibility threshold 0.6
    is_eligible = float(latest_metric.risk_probability) >= 0.6

    new_claim = models.Claim(
        farm_id=claim.farm_id,
        user_id=current_user.id,
        metric_id=latest_metric.id,
        status="pending",
        is_eligible=is_eligible
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

@app.get("/claims", response_model=list[schemas.ClaimResponse])
def get_claims(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Claim).filter(models.Claim.user_id == current_user.id).order_by(models.Claim.created_at.desc()).all()

@app.get("/claims/{id}", response_model=schemas.ClaimResponse)
def get_claim(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id, models.Claim.user_id == current_user.id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return db_claim

@app.post("/claims/{id}/generate-proof", response_model=schemas.ClaimResponse)
def generate_proof(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id, models.Claim.user_id == current_user.id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if db_claim.proof_data:
        return db_claim # Already generated
    
    # Get the metric to pass to ZK circuit
    db_metric = db.query(models.FarmMetric).filter(models.FarmMetric.id == db_claim.metric_id).first()
    if not db_metric:
        raise HTTPException(status_code=400, detail="Metric missing")

    risk_probability = float(db_metric.risk_probability)
    
    proof_json = services.generate_zk_proof(db_claim.id, risk_probability)
    db_claim.proof_data = proof_json
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.post("/claims/{id}/log-blockchain", response_model=schemas.ClaimResponse)
def log_blockchain(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id, models.Claim.user_id == current_user.id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if db_claim.tx_hash:
        return db_claim # Already logged

    if not db_claim.proof_data:
        raise HTTPException(status_code=400, detail="Must generate proof before logging to blockchain")

    tx_hash = services.log_to_blockchain(db_claim.id, db_claim.proof_data)
    db_claim.tx_hash = tx_hash
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.get("/admin/claims", response_model=list[schemas.ClaimResponse])
def admin_get_claims(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.Claim).order_by(models.Claim.created_at.desc()).all()

@app.post("/admin/claims/{id}/verify")
def admin_verify_claim(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id).first()
    if not db_claim or not db_claim.proof_data:
        raise HTTPException(status_code=404, detail="Claim or proof not found")
    
    is_valid = services.verify_zk_proof(db_claim.id, db_claim.proof_data)
    return {"is_valid": is_valid}

@app.post("/admin/claims/{id}/approve", response_model=schemas.ClaimResponse)
def admin_approve_claim(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    db_claim.status = "approved"
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.post("/admin/claims/{id}/reject", response_model=schemas.ClaimResponse)
def admin_reject_claim(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    db_claim.status = "rejected"
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.post("/farms/{id}/mint-nft", response_model=schemas.FarmResponse)
def mint_farm_nft(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_farm = db.query(models.Farm).filter(models.Farm.id == id, models.Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
        
    latest_metric = db.query(models.FarmMetric).filter(models.FarmMetric.farm_id == id).order_by(models.FarmMetric.captured_at.desc()).first()
    if not latest_metric:
        raise HTTPException(status_code=400, detail="Farm has no metrics to mint NFT")
        
    nft_url = nft_service.generate_farm_nft(
        farm_id=id, 
        risk_level=latest_metric.risk_level, 
        ndvi=latest_metric.ndvi_avg
    )
    
    db_farm.nft_url = nft_url
    db.commit()
    db.refresh(db_farm)
    return db_farm


# ========== Phase 3D: WhatsApp Business Webhook & Message Log ==========

from pydantic import BaseModel
from fastapi import Response
import xml.sax.saxutils as saxutils
from sms_service import get_message_log
from whatsapp_ai_service import handle_whatsapp_inbound, get_whatsapp_conversations, set_user_language

class WhatsAppSimulateRequest(BaseModel):
    phone: str = "+919876543210"
    message: str = ""
    media_url: Optional[str] = None
    language: Optional[str] = None

@app.post("/webhooks/whatsapp-inbound")
def whatsapp_inbound_webhook(
    From: str = Form("whatsapp:+919876543210"),
    Body: str = Form("help"),
    NumMedia: int = Form(0),
    MediaUrl0: Optional[str] = Form(None),
    MediaContentType0: Optional[str] = Form(None),
):
    """
    Twilio WhatsApp Business inbound webhook.
    Returns valid TwiML XML for live WhatsApp message delivery.
    """
    phone = From.replace("whatsapp:", "")
    result = handle_whatsapp_inbound(
        from_number=phone,
        body=Body,
        num_media=NumMedia,
        media_url=MediaUrl0,
        media_content_type=MediaContentType0
    )
    ai_reply = result.get("ai_reply", "Namaste! AgriShield AI is ready to help.")
    escaped_reply = saxutils.escape(ai_reply)
    twiml_xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped_reply}</Message></Response>'
    return Response(content=twiml_xml, media_type="application/xml")


@app.post("/api/whatsapp/simulate")
def simulate_whatsapp_message(req: WhatsAppSimulateRequest):
    """Interactive sandbox endpoint for testing photo upload diagnosis & Q&A from web UI."""
    if req.language:
        set_user_language(req.phone, req.language)
    return handle_whatsapp_inbound(
        from_number=req.phone,
        body=req.message,
        num_media=1 if req.media_url else 0,
        media_url=req.media_url
    )


@app.get("/api/whatsapp/conversations")
def get_wa_conversations():
    """Get all WhatsApp conversation messages."""
    return get_whatsapp_conversations()


@app.get("/api/messages/log")
def get_all_messages():
    """Get full message log (SMS + WhatsApp, inbound + outbound)."""
    # Combine SMS logs with rich WhatsApp conversations
    sms_logs = get_message_log()
    wa_logs = get_whatsapp_conversations()
    # Merge and sort by timestamp
    combined = sms_logs + [w for w in wa_logs if w not in sms_logs]
    combined.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return combined



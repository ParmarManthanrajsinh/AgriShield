from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
import os

from fastapi.staticfiles import StaticFiles
import models, schemas, auth, services, nft_service
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CropGuard MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for NFTs
base_dir = os.path.dirname(os.path.abspath(__file__))
nfts_dir = os.path.join(base_dir, "nfts")
os.makedirs(nfts_dir, exist_ok=True)
app.mount("/nfts", StaticFiles(directory=nfts_dir), name="nfts")

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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/farms", response_model=list[schemas.FarmResponse])
def get_farms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()

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
    
    weather = services.fetch_weather(float(db_farm.lat), float(db_farm.lng))
    
    risk_level, risk_prob = services.compute_risk(ndvi, ndvi_change, weather['rainfall_mm'], weather['temp_c'], weather['humidity'])
    
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
def admin_get_claims(db: Session = Depends(get_db)):
    # For MVP, skipping explicit admin role check. Any logged-in user can access.
    return db.query(models.Claim).order_by(models.Claim.created_at.desc()).all()

@app.post("/admin/claims/{id}/verify")
def admin_verify_claim(id: int, db: Session = Depends(get_db)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id).first()
    if not db_claim or not db_claim.proof_data:
        raise HTTPException(status_code=404, detail="Claim or proof not found")
    
    is_valid = services.verify_zk_proof(db_claim.id, db_claim.proof_data)
    return {"is_valid": is_valid}

@app.post("/admin/claims/{id}/approve", response_model=schemas.ClaimResponse)
def admin_approve_claim(id: int, db: Session = Depends(get_db)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    db_claim.status = "approved"
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.post("/admin/claims/{id}/reject", response_model=schemas.ClaimResponse)
def admin_reject_claim(id: int, db: Session = Depends(get_db)):
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

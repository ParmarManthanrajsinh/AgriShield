from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class FarmBase(BaseModel):
    name: str
    lat: str
    lng: str
    boundary_geojson: str
    area_hectares: str

class FarmCreate(FarmBase):
    pass

class FarmResponse(FarmBase):
    id: int
    user_id: int
    created_at: datetime
    nft_url: str | None = None

    class Config:
        from_attributes = True

class FarmMetricResponse(BaseModel):
    id: int
    farm_id: int
    captured_at: datetime
    ndvi_avg: str
    rainfall_mm: str
    temp_c: str
    humidity: str
    risk_level: str
    risk_probability: str
    source: str

    class Config:
        from_attributes = True

class ClaimCreate(BaseModel):
    farm_id: int

class ClaimResponse(BaseModel):
    id: int
    farm_id: int
    user_id: int
    metric_id: int
    status: str
    is_eligible: bool
    proof_data: str | None
    tx_hash: str | None
    created_at: datetime

    class Config:
        from_attributes = True

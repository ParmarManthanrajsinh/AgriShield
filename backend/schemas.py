from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class UserResponse(UserBase):
    id: int
    role: str = "farmer"
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
    lat: str | None = None
    lng: str | None = None
    boundary_geojson: str | None = None
    area_hectares: str | float | None = None

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

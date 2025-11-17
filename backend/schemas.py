# schemas.py
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class Genre(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}

class Venue(BaseModel):
    id: int
    name: str
    address: Optional[str]

    model_config = {"from_attributes": True}

class PriceTier(BaseModel):
    id: int
    name: str
    price: float

    model_config = {"from_attributes": True}

class EventBase(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_datetime: datetime
    end_datetime: datetime
    genre: Optional[Genre]
    venue: Optional[Venue]
    price_tiers: List[PriceTier] = []

    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    role: str
    wallet_balance: float

    model_config = {"from_attributes": True}

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None

class LoginForm(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

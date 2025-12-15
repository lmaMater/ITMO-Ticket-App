from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class Genre(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)

class Venue(BaseModel):
    id: int
    name: str
    address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PriceTier(BaseModel):
    id: int
    name: str
    price: float
    capacity: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class EventBase(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    genre: Optional[Genre] = None
    venue: Optional[Venue] = None
    price_tiers: List[PriceTier] = []

    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    wallet_balance: float

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class OrderItemCreate(BaseModel):
    ticket_id: Optional[int] = None
    tier_id: Optional[int] = None
    quantity: Optional[int] = 1
    price: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]

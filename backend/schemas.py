from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    email: str
    password: str

class UserAuth(BaseModel):
    email: str
    password: str

class EventBase(BaseModel):
    id: int
    title: str
    description: str
    total_seats: int
    price: float
    class Config: orm_mode = True

class BookingOut(BaseModel):
    id: int
    event_id: int
    seat_number: int
    paid: bool
    refunded: bool
    class Config: orm_mode = True

class BalanceTopUp(BaseModel):
    amount: float

class SeatRequest(BaseModel):
    seat: int = Field(..., ge=1)
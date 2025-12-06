from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal
from models import User, Event, Booking
from schemas import *
from auth import create_token, get_current_user
import re
import schemas
import crud
import seed

Base.metadata.create_all(bind=engine)
app = FastAPI()


def get_db():
    d = SessionLocal()
    try: yield d
    finally: d.close()

@app.on_event("startup")
def init_data():
    seed.seed_events()

# ------------------------
#  REGISTRATION & LOGIN
# ------------------------
EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@app.post("/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Email validation
    if not re.match(EMAIL_REGEX, user.email):
        raise HTTPException(400, "Invalid email format")

    # Password validation
    if len(user.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    if not any(c.isdigit() for c in user.password):
        raise HTTPException(400, "Password must contain at least one number")

    if not any(c.isalpha() for c in user.password):
        raise HTTPException(400, "Password must contain letters")

    # Check if email exists
    if db.query(User).filter_by(email=user.email).first():
        raise HTTPException(400, "Email exists")

    u = User(email=user.email, password=user.password)
    db.add(u)
    db.commit()

    return {"ok": True}

@app.post("/auth/login")
def login(data: UserAuth, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(email=data.email, password=data.password).first()
    if not u:
        raise HTTPException(400, "Bad credentials")
    return {"token": create_token({"user_id": u.id, "email": u.email})}


# -------------------------
# EVENTS LIST
# -------------------------
@app.get("/events", response_model=list[schemas.EventBase])
def list_events(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_events(db, limit)


# -------------------------
# TOP EVENTS
# -------------------------
@app.get("/events/top", response_model=list[schemas.EventBase])
def top_events(limit: int = 10, db: Session = Depends(get_db)):
    events = crud.get_top_events(db, limit)
    return events


# -------------------------
# EVENT DETAILS
# -------------------------
@app.get("/events/{event_id}", response_model=schemas.EventBase)
def event_detail(event_id: int, db: Session = Depends(get_db)):
    ev = crud.get_event(db, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="event not found")
    return ev


# -------------------------
# MIN PRICE
# -------------------------
@app.get("/events/{event_id}/min_price")
def event_min_price(event_id: int, db: Session = Depends(get_db)):
    min_price = crud.get_event_min_price(db, event_id)
    if min_price is None:
        raise HTTPException(status_code=404, detail="No tickets found")
    return {"min_price": min_price}


# ------------------------
#  BOOKING
# ------------------------
from datetime import datetime, timedelta

@app.post("/events/{event_id}/book")
def book(
    event_id: int,
    data: SeatRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")

    if data.seat > event.total_seats:
        raise HTTPException(400, "Invalid seat")

    occupied = db.query(Booking).filter_by(
        event_id=event_id,
        seat_number=data.seat
    ).first()

    if occupied:
        raise HTTPException(400, "Seat taken")

    booking = Booking(
    user_id=user["user_id"],
    event_id=event_id,
    seat_number=data.seat,
    expires_at=datetime.utcnow() + timedelta(minutes=5)
)

    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {"status": "booked", "booking_id": booking.id}



# ------------------------
#  PAYMENT SIMULATION
# ------------------------
@app.post("/pay/{booking_id}")
def pay(booking_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Booking).get(booking_id)
    if not b or b.user_id != user["user_id"]:
        raise HTTPException(404, "Booking not found")

    if b.expires_at and b.expires_at < datetime.utcnow():
        db.delete(b)
        db.commit()
        raise HTTPException(400, "Booking expired")

    if b.paid:
        raise HTTPException(400, "Already paid")

    u = db.query(User).get(user["user_id"])

    # Проверяем баланс
    if u.balance < b.event.price:
        raise HTTPException(400, "Not enough money")

    # Списываем деньги
    u.balance -= b.event.price

    # Отмечаем как оплачено
    b.paid = True

    db.commit()

    return {
        "status": "paid",
        "remaining_balance": u.balance
    }



# ------------------------
#  REFUND
# ------------------------
@app.post("/refund/{booking_id}")
def refund(booking_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Booking).get(booking_id)
    if not b or b.user_id != user["user_id"]:
        raise HTTPException(404, "Booking not found")

    if not b.paid:
        raise HTTPException(400, "Booking not paid")

    if b.refunded:
        raise HTTPException(400, "Already refunded")

    u = db.query(User).get(user["user_id"])
    if not u:
        raise HTTPException(404, "User not found")

    # Возврат денег
    u.balance += b.event.price

    # Обновляем бронь
    b.refunded = True
    db.commit()
    db.refresh(u)
    db.refresh(b)

    return {
        "status": "refunded",
        "returned_amount": b.event.price,
        "new_balance": u.balance
    }



@app.get("/me/bookings")
def my_bookings(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Booking).filter_by(user_id=user["user_id"]).all()

@app.get("/me/balance")
def get_balance(user=Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(User).filter_by(id=user["user_id"]).first()
    return {"balance": u.balance}


@app.post("/me/balance/topup")
def top_up_balance(data: schemas.BalanceTopUp, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(400, "Amount must be positive")

    u = db.query(User).filter_by(id=user["user_id"]).first()
    u.balance += data.amount
    db.commit()

    return {"new_balance": u.balance}
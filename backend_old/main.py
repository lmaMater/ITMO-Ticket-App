from fastapi import FastAPI, Depends, HTTPException, Body, Form
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, crud, schemas
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.hash import argon2
from datetime import datetime

SECRET_KEY = "supersecret"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
models.Base = models.__dict__.get('Base', None)  # guard

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
  allow_methods=["*"],
  allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/events", response_model=list[schemas.EventBase])
def list_events(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_events(db, limit)

@app.get("/events/top", response_model=list[schemas.EventBase])
def top_events(limit: int = 10, db: Session = Depends(get_db)):
    events = crud.get_top_events(db, limit)
    return events

@app.get("/events/{event_id}", response_model=schemas.EventBase)
def event_detail(event_id: int, db: Session = Depends(get_db)):
    ev = crud.get_event(db, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="event not found")
    
    return ev

@app.get("/events/{event_id}/min_price")
def event_min_price(event_id: int, db: Session = Depends(get_db)):
    min_price = crud.get_event_min_price(db, event_id)
    if min_price is None:
        raise HTTPException(status_code=404, detail="No tickets found")
    return {"min_price": min_price}

@app.post("/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    hashed_password = argon2.hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name or ""
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # создаём токен сразу
    token = jwt.encode({"sub": db_user.email}, SECRET_KEY, algorithm="HS256")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "full_name": db_user.full_name
        }
    }


@app.post("/auth/login")
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not argon2.verify(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неправильный email или пароль")
    
    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm="HS256")
    
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid auth")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid auth")
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.patch("/users/me")
def update_profile(
    updates: schemas.UserUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if updates.email:
        # проверяем уникальность
        existing = db.query(models.User).filter(models.User.email == updates.email, models.User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        current_user.email = updates.email
    if updates.name:
        current_user.name = updates.name

    db.commit()
    db.refresh(current_user)
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}

@app.get("/users/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name if hasattr(current_user, "name") else None
    }

@app.post("/orders")
def create_order(
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # создаём заказ
    new_order = models.Order(
        user_id=current_user.id,
        total_amount=0,  # потом посчитаем
        status="pending"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    items = []
    total = 0

    for item_data in order_data.items:
        ticket = db.query(models.Ticket).filter(models.Ticket.id == item_data.ticket_id).first()
        if not ticket:
            continue
        order_item = models.OrderItem(
            order_id=new_order.id,
            ticket_id=ticket.id,
            price=ticket.price
        )
        total += float(ticket.price)
        db.add(order_item)
        items.append(order_item)

    new_order.total_amount = total
    db.commit()
    db.refresh(new_order)

    return {
        "id": new_order.id,
        "total_amount": float(new_order.total_amount),
        "status": new_order.status,
        "items": [
            {
                "ticket_id": it.ticket.id,
                "event_id": it.ticket.event_id,
                "tier_id": it.ticket.tier_id,
                "price": float(it.price)
            }
            for it in new_order.items  # <- здесь обращаемся через relationship
        ]
    }


@app.get("/orders/me")
def get_my_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()
    result = []
    for o in orders:
        result.append({
            "id": o.id,
            "total_amount": o.total_amount,
            "status": o.status,
            "items": [
                {
                    "id": i.id,
                    "ticket_name": i.ticket.name if hasattr(i.ticket, "name") else f"Билет {i.ticket_id}",
                    "price": i.price
                }
                for i in o.items
            ]
        })
    return result

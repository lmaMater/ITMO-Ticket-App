from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal
from datetime import datetime
from jose import jwt, JWTError
from passlib.hash import argon2
from dotenv import load_dotenv
import os, traceback

import models, crud, schemas
from database import SessionLocal, init_db

# --- config ---
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

load_dotenv()
INITIAL_BALANCE = Decimal(os.getenv("INITIAL_BALANCE", "3000.00"))

# --- init ---
init_db()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- auth utils ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid auth")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid auth")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- events ---
@app.get("/events", response_model=list[schemas.EventBase])
def list_events(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_events(db, limit)

@app.get("/events/{event_id}/tickets")
def available_tickets(event_id: int, tier_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
        SELECT t.id, s.row_label, s.seat_number, t.status
        FROM tickets t
        JOIN seats s ON s.id = t.seat_id
        WHERE t.event_id = :e AND t.tier_id = :t
        ORDER BY s.row_label, s.seat_number
        """),
        {"e": event_id, "t": tier_id}
    ).fetchall()

    return [
        {
            "id": r.id,
            "row_label": r.row_label,
            "seat_number": r.seat_number,
            "status": r.status
        }
        for r in rows
    ]

@app.get("/events/top", response_model=list[schemas.EventBase])
def top_events(limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_top_events(db, limit)

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

@app.get("/events/{event_id}/tier/{tier_id}/available")
def get_available_tickets(event_id: int, tier_id: int, db: Session = Depends(get_db)):
    """
    Возвращаем для конкретного тарифа:
      - available: сколько билетов в этом тарифе со статусом 'available'
      - has_seats: есть ли у этого тарифа билеты с seat_id != NULL (т.е. сидячие места)
    """
    available_count = db.query(models.Ticket).filter(
        models.Ticket.event_id == event_id,
        models.Ticket.tier_id == tier_id,
        models.Ticket.status == "available"
    ).count()
    
    has_seats = db.query(models.Ticket).filter(
        models.Ticket.event_id == event_id,
        models.Ticket.tier_id == tier_id,
        models.Ticket.seat_id != None
    ).count() > 0

    return {"available": available_count, "has_seats": has_seats}


@app.get("/events/{event_id}/has-seats")
def has_seats(event_id: int, db: Session = Depends(get_db)):
    count = db.execute(
        text("""
        SELECT COUNT(*) 
        FROM tickets 
        WHERE event_id = :id 
          AND seat_id IS NOT NULL
        """),
        {"id": event_id}
    ).scalar()

    return {"has_seats": count > 0}

# --- tickets ---
@app.post("/tickets/{ticket_id}/activate")
def activate_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Активировать конкретный билет (ticket_id).
    Требования:
      - билет должен принадлежать current_user
      - статус должен быть 'sold' (оплачен, но не активирован)
    Возвращает обновлённый статус и баланс.
    """
    try:
        # блокируем строку, чтобы избежать гонок
        ticket = db.query(models.Ticket).with_for_update().filter(
            models.Ticket.id == ticket_id,
            models.Ticket.user_id == current_user.id
        ).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found or not owned by user")
        if ticket.status != "sold":
            raise HTTPException(status_code=400, detail=f"Cannot activate ticket with status {ticket.status}")

        ticket.status = "activated"
        db.commit()
        return {"ticket_id": ticket.id, "status": ticket.status}
    except HTTPException:
        try: db.rollback()
        except: pass
        raise
    except Exception as e:
        traceback.print_exc()
        try: db.rollback()
        except: pass
        raise HTTPException(status_code=500, detail="Internal server error")


# --- orders: refund & list ---
@app.post("/orders/{order_id}/refund")
def refund_order(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Частичный возврат: возвращаем только билеты с ticket.status == 'sold'.
    Не трогаем total_amount, меняем только статус и билетные статусы.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id, models.Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    refundable_items = [i for i in order.items if i.ticket and i.ticket.status == "sold"]
    if not refundable_items:
        raise HTTPException(status_code=400, detail="Нет билетов для возврата (все активированы или отменены)")

    refund_amount = sum(Decimal(str(i.price)) for i in refundable_items)

    try:
        # помечаем тикеты как canceled
        for item in refundable_items:
            item.ticket.status = "canceled"

        # если все билеты возвращены — считаем заказ полностью возвращённым
        if all(i.ticket.status != "sold" for i in order.items):
            order.status = "refunded"

        # возвращаем деньги на кошелёк
        current_user.wallet_balance = (Decimal(str(current_user.wallet_balance or 0)) + refund_amount)
        db.add(models.WalletTransaction(user_id=current_user.id, amount=refund_amount, reason="refund"))

        db.commit()

        return {
            "refunded": len(refundable_items),
            "amount": float(refund_amount),
            "wallet_balance": float(current_user.wallet_balance)
        }
    except Exception:
        traceback.print_exc()
        try: db.rollback()
        except: pass
        raise HTTPException(status_code=500, detail="Internal server error")

# --- auth ---
@app.post("/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    db_user = models.User(
        email=user.email,
        password_hash=argon2.hash(user.password),
        full_name=user.full_name or "",
        wallet_balance=INITIAL_BALANCE
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    token = jwt.encode({"sub": db_user.email}, SECRET_KEY, algorithm="HS256")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "wallet_balance": float(db_user.wallet_balance or 0)
        }
    }

@app.post("/auth/login")
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not argon2.verify(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неправильный email или пароль")

    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm="HS256")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "wallet_balance": float(user.wallet_balance or 0)
        }
    }

# --- users ---
@app.get("/users/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    try:
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "wallet_balance": float(current_user.wallet_balance or 0)
        }
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to serialize user")

@app.patch("/users/me")
def update_profile(updates: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if updates.email:
        if db.query(models.User).filter(models.User.email == updates.email, models.User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        current_user.email = updates.email
    if updates.full_name is not None:
        current_user.full_name = updates.full_name
    db.commit()
    db.refresh(current_user)
    return {"id": current_user.id, "full_name": current_user.full_name, "email": current_user.email}


# --- orders: creation (already present) ---
@app.post("/orders")
def create_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total = Decimal("0.00")
    tickets_to_buy = []

    try:
        print("[ORDER] payload:", order_data)
        print("[ORDER] user_before:", current_user.email, current_user.wallet_balance)

        for it in order_data.items:
            qty = int(it.quantity or 1)

            if getattr(it, "ticket_id", None):
                ticket = db.query(models.Ticket).with_for_update().filter(models.Ticket.id == it.ticket_id).first()
                if not ticket:
                    raise HTTPException(status_code=404, detail=f"Ticket {it.ticket_id} not found")
                if ticket.status != "available":
                    raise HTTPException(status_code=400, detail=f"Ticket {it.ticket_id} not available")
                tickets_to_buy.append(ticket)
                total += Decimal(str(ticket.price or 0))

            elif getattr(it, "tier_id", None):
                available = (
                    db.query(models.Ticket)
                      .with_for_update()
                      .filter(models.Ticket.tier_id == it.tier_id, models.Ticket.status == "available")
                      .order_by(models.Ticket.id)
                      .limit(qty)
                      .all()
                )
                if not available or len(available) < qty:
                    raise HTTPException(status_code=400, detail=f"Not enough available tickets for tier {it.tier_id}")
                for t in available:
                    tickets_to_buy.append(t)
                    total += Decimal(str(t.price or 0))
            else:
                raise HTTPException(status_code=400, detail="Order item must include ticket_id or tier_id")

        print(f"[ORDER DEBUG] total={total}; balance_before={current_user.wallet_balance}")

        user_balance = Decimal(str(current_user.wallet_balance or "0"))
        if user_balance < total:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        new_order = models.Order(user_id=current_user.id, total_amount=total, status="paid")
        db.add(new_order)
        db.flush()

        for ticket in tickets_to_buy:
            ticket.status = "sold"
            ticket.user_id = current_user.id
            db.add(models.OrderItem(order_id=new_order.id, ticket_id=ticket.id, price=ticket.price))

        current_user.wallet_balance = user_balance - total
        db.add(models.WalletTransaction(user_id=current_user.id, amount=-total, reason="purchase"))

        db.commit()

        print(f"[ORDER DEBUG] user_after={current_user.email} balance_after={current_user.wallet_balance}")

    except HTTPException:
        try: db.rollback()
        except: pass
        raise
    except Exception:
        traceback.print_exc()
        try: db.rollback()
        except: pass
        raise HTTPException(status_code=500, detail="Internal server error")

    return {
        "id": new_order.id,
        "total_amount": float(new_order.total_amount),
        "status": new_order.status,
        "items": [{"ticket_id": t.id, "price": float(t.price)} for t in tickets_to_buy],
        "wallet_balance": float(current_user.wallet_balance)
    }


@app.get("/orders/me")
def get_my_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Возвращаем заказы пользователя с деталями билетов.
    Сортируем по newest first.
    """
    orders = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.ticket).joinedload(models.Ticket.event),
        joinedload(models.Order.items).joinedload(models.OrderItem.ticket).joinedload(models.Ticket.tier),
        joinedload(models.Order.items).joinedload(models.OrderItem.ticket).joinedload(models.Ticket.seat),
    ).filter(models.Order.user_id == current_user.id).order_by(models.Order.created_at.desc()).all()

    result = []
    for o in orders:
        order_items = []
        for i in o.items:
            ticket = i.ticket
            if not ticket:
                continue
            event = ticket.event
            tier = ticket.tier
            seat_label = f"{getattr(ticket.seat, 'row_label','')}{getattr(ticket.seat,'seat_number','')}" if ticket.seat else None
            order_items.append({
                "id": i.id,
                "ticket_id": ticket.id,
                "ticket_name": getattr(ticket, "qr_code", f"Билет {ticket.id}"),
                "tier_name": tier.name if tier else None,
                "seat_label": seat_label,
                "event_title": event.title if event else None,
                "event_poster": getattr(event, "poster_url", None),
                "price": float(i.price),
                "status": ticket.status
            })

        result.append({
            "id": o.id,
            "total_amount": float(o.total_amount),
            "status": o.status,
            "items": order_items
        })
    return result
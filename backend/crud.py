from sqlalchemy.orm import Session, joinedload
from passlib.hash import argon2
import uuid
import models, schemas
from datetime import datetime

def get_events(db: Session, limit: int = 20):
    return db.query(models.Event)\
             .options(
                 joinedload(models.Event.genre),
                 joinedload(models.Event.venue),
                 joinedload(models.Event.price_tiers)
             )\
             .order_by(models.Event.start_datetime)\
             .limit(limit).all()

def get_event(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id==event_id).first()

def get_tickets_for_event(db: Session, event_id: int, status='available'):
    return db.query(models.Ticket).filter(models.Ticket.event_id==event_id, models.Ticket.status==status).all()

def get_top_events(db: Session, limit: int = 10):
    return (
        db.query(models.Event)
        .options(
            joinedload(models.Event.price_tiers),
            joinedload(models.Event.venue),
            joinedload(models.Event.genre)
        )
        .filter(models.Event.start_datetime >= datetime.now())
        .order_by(models.Event.start_datetime)
        .limit(limit)
        .all()
    )

def get_event_min_price(db: Session, event_id: int):
    result = db.query(models.PriceTier.price).filter(models.PriceTier.event_id == event_id).order_by(models.PriceTier.price).first()
    return result[0] if result else None

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, email: str, password: str):
    hashed = argon2.hash(password)
    user = models.User(email=email, password_hash=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email==email).first()
    if not user or not user.verify_password(password):
        return None
    return user

# --- ADMIN EVENTS ---

def admin_create_event(db: Session, data: schemas.EventCreate):
    ev = models.Event(
        title=data.title,
        description=data.description,
        genre_id=data.genre_id,
        venue_id=data.venue_id,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        poster_url=data.poster_url
    )
    db.add(ev)
    db.flush()  # чтобы получить ev.id

    # получим все seats для зала (упорядоченные)
    seat_rows = db.query(models.Seat).filter(models.Seat.venue_id == data.venue_id).order_by(models.Seat.row_label, models.Seat.seat_number).all()
    seat_ids = [s.id for s in seat_rows]
    seat_index = 0

    # если price_tiers передали — создаём их и билеты
    tiers = getattr(data, "price_tiers", []) or []
    for t in tiers:
        pt = models.PriceTier(event_id=ev.id, name=t.name, price=t.price, capacity=t.capacity)
        db.add(pt)
        db.flush()  # pt.id

        # создаём tickets для этого тарифа
        cap = int(t.capacity or 0)
        for _ in range(cap):
            sid = None
            # даём сидение если есть свободные сидения
            if seat_index < len(seat_ids):
                sid = seat_ids[seat_index]
                seat_index += 1
            ticket = models.Ticket(
                event_id=ev.id,
                seat_id=sid,
                tier_id=pt.id,
                user_id=None,
                status="available",
                price=pt.price,
                qr_code=str(uuid.uuid4())
            )
            db.add(ticket)

    db.commit()

    # загрузим event с нужными связями и вернём
    ev = db.query(models.Event)\
           .options(joinedload(models.Event.venue), joinedload(models.Event.genre), joinedload(models.Event.price_tiers))\
           .filter(models.Event.id == ev.id)\
           .first()
    return ev

def admin_update_event(db: Session, event_id: int, data: schemas.EventUpdate):
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        return None

    # обновляем поля
    ev.title = data.title or ev.title
    ev.description = data.description or ev.description
    ev.genre_id = data.genre_id if data.genre_id is not None else ev.genre_id
    ev.venue_id = data.venue_id if data.venue_id is not None else ev.venue_id
    ev.start_datetime = data.start_datetime or ev.start_datetime
    ev.end_datetime = data.end_datetime or ev.end_datetime
    ev.poster_url = data.poster_url or ev.poster_url
    db.add(ev)
    db.flush()

    # удалим старые билеты и тарифы — проще и надёжнее, затем пересоздадим по переданным
    db.query(models.Ticket).filter(models.Ticket.event_id == ev.id).delete(synchronize_session=False)
    db.query(models.PriceTier).filter(models.PriceTier.event_id == ev.id).delete(synchronize_session=False)
    db.flush()

    # снова получить сиденья актуального зала
    seat_rows = db.query(models.Seat).filter(models.Seat.venue_id == ev.venue_id).order_by(models.Seat.row_label, models.Seat.seat_number).all()
    seat_ids = [s.id for s in seat_rows]
    seat_index = 0

    tiers = getattr(data, "price_tiers", []) or []
    for t in tiers:
        pt = models.PriceTier(event_id=ev.id, name=t.name, price=t.price, capacity=t.capacity)
        db.add(pt)
        db.flush()

        cap = int(t.capacity or 0)
        for _ in range(cap):
            sid = None
            if seat_index < len(seat_ids):
                sid = seat_ids[seat_index]
                seat_index += 1
            ticket = models.Ticket(
                event_id=ev.id,
                seat_id=sid,
                tier_id=pt.id,
                user_id=None,
                status="available",
                price=pt.price,
                qr_code=str(uuid.uuid4())
            )
            db.add(ticket)

    db.commit()

    ev = db.query(models.Event)\
           .options(joinedload(models.Event.venue), joinedload(models.Event.genre), joinedload(models.Event.price_tiers))\
           .filter(models.Event.id == ev.id)\
           .first()
    return ev


def admin_delete_event(db: Session, event_id: int):
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        return False
    db.delete(ev)
    db.commit()
    return True

# --- ADMIN VENUES ---

def admin_create_venue(db: Session, data):
    v = models.Venue(**data.dict())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

def admin_update_venue(db: Session, venue_id: int, data):
    v = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not v:
        return None
    for k, val in data.dict(exclude_unset=True).items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return v

def admin_delete_venue(db: Session, venue_id: int):
    v = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not v:
        return False
    db.delete(v)
    db.commit()
    return True


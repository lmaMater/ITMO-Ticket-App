from sqlalchemy.orm import Session
from models import Event, Booking
from sqlalchemy import func


def get_events(db: Session, limit: int = 20):
    return db.query(Event).limit(limit).all()


def get_top_events(db: Session, limit: int = 10):
    # Топ = самые продаваемые по количеству бронирований
    return (
        db.query(Event)
        .outerjoin(Booking, Booking.event_id == Event.id)
        .group_by(Event.id)
        .order_by(func.count(Booking.id).desc())
        .limit(limit)
        .all()
    )


def get_event(db: Session, event_id: int):
    return db.query(Event).filter(Event.id == event_id).first()


def get_event_min_price(db: Session, event_id: int):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        return None
    return ev.price   # У нас базовая модель, цена одна
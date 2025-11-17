from sqlalchemy.orm import Session, joinedload
from passlib.hash import argon2
import models
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


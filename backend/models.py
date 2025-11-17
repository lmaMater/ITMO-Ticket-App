# models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Numeric, TIMESTAMP
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
from passlib.hash import argon2

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user")
    wallet_balance = Column(Numeric(10, 2), default=0.00)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    def verify_password(self, password: str) -> bool:
        return argon2.verify(password, self.password_hash)
    
class Genre(Base):
    __tablename__ = "genres"
    id = Column(Integer, primary_key=True)
    name = Column(String)

class Venue(Base):
    __tablename__ = "venues"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    address = Column(String)

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    start_datetime = Column(DateTime)
    end_datetime = Column(DateTime)
    
    genre_id = Column(Integer, ForeignKey("genres.id"))
    venue_id = Column(Integer, ForeignKey("venues.id"))
    
    genre = relationship("Genre")
    venue = relationship("Venue")
    price_tiers = relationship("PriceTier", backref="event")

class PriceTier(Base):
    __tablename__ = "price_tiers"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    price = Column(Integer)
    name = Column(String)

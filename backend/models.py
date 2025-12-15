from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, TIMESTAMP, Text, JSON
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = full_name = Column(String, nullable=True, default="")
    role = Column(String, default="user")
    wallet_balance = Column(Numeric(10, 2), default=0.00)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    def verify_password(self, password: str) -> bool:
        # verify outside (passlib) or keep helper
        from passlib.hash import argon2
        return argon2.verify(password, self.password_hash)

class Genre(Base):
    __tablename__ = "genres"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

class Venue(Base):
    __tablename__ = "venues"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String)
    seats_map_json = Column(JSON)

class Seat(Base):
    __tablename__ = "seats"
    id = Column(Integer, primary_key=True)
    venue_id = Column(Integer, ForeignKey("venues.id"))
    row_label = Column(String)
    seat_number = Column(Integer)
    seat_type = Column(String)
    base_price = Column(Numeric(10,2), nullable=False)

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime)
    genre_id = Column(Integer, ForeignKey("genres.id"))
    venue_id = Column(Integer, ForeignKey("venues.id"))
    poster_url = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    genre = relationship("Genre")
    venue = relationship("Venue")
    price_tiers = relationship("PriceTier", back_populates="event")

class PriceTier(Base):
    __tablename__ = "price_tiers"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    name = Column(String, nullable=False)
    price = Column(Numeric(10,2), nullable=False)
    capacity = Column(Integer)

    event = relationship("Event", back_populates="price_tiers")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=True)  # добавил
    tier_id = Column(Integer, ForeignKey("price_tiers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, nullable=False, default="available")  # available, held, sold, refunded, used
    hold_expires_at = Column(DateTime, nullable=True)  # добавил
    price = Column(Numeric(10, 2))
    qr_code = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    event = relationship("Event")
    seat = relationship("Seat")
    tier = relationship("PriceTier")
    owner = relationship("User")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String, default="pending")
    payment_method = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    price = Column(Numeric(10, 2), nullable=False)

    ticket = relationship("Ticket")
    order = relationship("Order", back_populates="items")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric(10,2), nullable=False)
    reason = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

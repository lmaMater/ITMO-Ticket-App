from database import Base, engine, SessionLocal
from models import Event


def seed_events():
    db = SessionLocal()

    Base.metadata.create_all(bind=engine)

    if db.query(Event).count() > 0:
        db.close()
        return

    events = [
        Event(title="Rock Festival 2025", description="Большой летний рок-фестиваль", total_seats=300, price=1500),
        Event(title="Python Conference", description="Конференция Python и AI", total_seats=150, price=4500),
        Event(title="Standup Night", description="Вечер стендапа", total_seats=80, price=900),
        Event(title="Classical Music Concert", description="Классическая музыка", total_seats=200, price=2300),
        Event(title="Techno Rave Party", description="Техно-вечеринка", total_seats=500, price=1200),
    ]

    db.add_all(events)
    db.commit()
    db.close()

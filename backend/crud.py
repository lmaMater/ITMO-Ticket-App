from sqlalchemy.orm import Session
import models
from datetime import date

def get_top_events(db: Session, limit: int = 10):
    return db.query(models.Event)\
             .filter(models.Event.event_date >= date.today())\
             .order_by(models.Event.event_date)\
             .limit(limit).all()

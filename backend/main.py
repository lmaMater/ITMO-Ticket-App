from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models, schemas, crud

Base.metadata.create_all(bind=engine)

app = FastAPI()

###
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # наш фронт
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
###


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Backend работает!"}

@app.get("/events/top", response_model=list[schemas.Event])
def top_events(db: Session = Depends(get_db)):
    return crud.get_top_events(db)

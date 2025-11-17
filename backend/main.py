from fastapi import FastAPI, Depends, HTTPException, Body, Form
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, crud, schemas
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.hash import argon2

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
    db_user = models.User(email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {"id": db_user.id, "email": db_user.email}


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
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/users/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name if hasattr(current_user, "name") else None
    }



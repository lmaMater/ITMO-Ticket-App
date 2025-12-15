import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
import models
from database import Base, get_db

# ---------------- TEST DB SETUP ----------------
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------------- FIXTURES ----------------
@pytest.fixture(scope="function", autouse=True)
def create_tables():
    """Создаем таблицы перед каждым тестом и очищаем после"""
    Base.metadata.create_all(bind=engine)
    yield
    # Очищаем данные после теста
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    # Base.metadata.drop_all(bind=engine)  # раскомментировать если нужно полностью удалять

@pytest.fixture()
def db():
    """Фикстура для сессии БД"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture()
def client():
    """Фикстура тестового клиента"""
    with TestClient(app) as c:
        yield c


import pytest
from jose import jwt
from datetime import datetime, timedelta

# ... остальной код ...

@pytest.fixture()
def admin_token():
    """Фикстура для создания тестового токена администратора"""
    # Создаем тестового пользователя в БД
    db = TestingSessionLocal()
    try:
        # Сначала убедимся, что пользователь существует
        from models import User
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            # Создаем пользователя если нет
            admin_user = User(
                username="admin",
                email="admin@test.com",
                hashed_password="hashed_password_for_test",
                balance=3000.0,
                is_admin=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        # Создаем токен
        SECRET_KEY = "test_secret_key"  # Должен совпадать с вашим SECRET_KEY в приложении
        ALGORITHM = "HS256"
        
        to_encode = {"sub": admin_user.username, "id": admin_user.id, "is_admin": True}
        expire = datetime.utcnow() + timedelta(minutes=30)
        to_encode.update({"exp": expire})
        
        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return token
    finally:
        db.close()
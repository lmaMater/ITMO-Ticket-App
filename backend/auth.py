import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from datetime import datetime, timedelta

JWT_SECRET = "secret123"
auth_scheme = HTTPBearer()

def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=12)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(token=Depends(auth_scheme)):
    try:
        data = jwt.decode(token.credentials, JWT_SECRET, algorithms=["HS256"])
        return data
    except:
        raise HTTPException(401, "Invalid token")

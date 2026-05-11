from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt, JWTError
import hashlib
import secrets
from sqlalchemy.orm import Session
from database import get_db
from models import User

router = APIRouter(prefix="/api/v1", tags=["auth"])

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return hash_obj.hex() + ':' + salt

def verify_password(plain: str, hashed: str) -> bool:
    stored_hash, salt = hashed.split(':')
    new_hash = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 100000).hex()
    return stored_hash == new_hash

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/register", status_code=201)
def register(user: UserRegister, db: Session = Depends(get_db)):
    if len(user.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(409, "Email already exists")

    hashed = hash_password(user.password)
    db_user = User(email=user.email, password_hash=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"user_id": db_user.id, "email": db_user.email}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

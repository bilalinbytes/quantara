from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.db.database import get_db
from app.db import models
from pydantic import BaseModel, EmailStr
import os
import uuid

router = APIRouter(prefix="/auth", tags=["authentication"])

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-quantara-jwt-signing-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()

# Pydantic Schemas for Auth requests
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class APIKeyResponse(BaseModel):
    api_key: str

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    token = credentials.credentials
    try:
        # Check if token is an API key first
        api_user = db.query(models.User).filter(models.User.api_key == token).first()
        if api_user:
            return api_user
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token claims")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Routes
@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed = hash_password(user_data.password)
    user = models.User(
        email=user_data.email,
        hashed_password=hashed,
        name=user_data.name or user_data.email.split("@")[0],
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate tokens
    access = create_access_token({"sub": user.email, "role": user.role})
    ref_token_str = str(uuid.uuid4())
    ref_expiry = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_ref = models.RefreshToken(
        token=ref_token_str,
        user_id=user.id,
        expires_at=ref_expiry
    )
    db.add(db_ref)
    db.commit()
    
    return TokenResponse(access_token=access, refresh_token=ref_token_str)

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    # Generate tokens
    access = create_access_token({"sub": user.email, "role": user.role})
    ref_token_str = str(uuid.uuid4())
    ref_expiry = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_ref = models.RefreshToken(
        token=ref_token_str,
        user_id=user.id,
        expires_at=ref_expiry
    )
    db.add(db_ref)
    db.commit()
    
    return TokenResponse(access_token=access, refresh_token=ref_token_str)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(ref_req: RefreshRequest, db: Session = Depends(get_db)):
    # Find token
    db_ref = db.query(models.RefreshToken).filter(models.RefreshToken.token == ref_req.refresh_token).first()
    if not db_ref:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Token reuse detection / revocation
    if db_ref.is_rotated or db_ref.is_revoked:
        # Revoke all active refresh tokens for the user due to potential theft!
        db.query(models.RefreshToken).filter(models.RefreshToken.user_id == db_ref.user_id).update(
            {models.RefreshToken.is_revoked: True}
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token has already been used or revoked. All active sessions invalidated.")
        
    if db_ref.expires_at < datetime.utcnow():
        db_ref.is_revoked = True
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")
        
    user = db.query(models.User).filter(models.User.id == db_ref.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Rotate token
    db_ref.is_rotated = True
    
    new_access = create_access_token({"sub": user.email, "role": user.role})
    new_ref_str = str(uuid.uuid4())
    new_ref_expiry = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    new_db_ref = models.RefreshToken(
        token=new_ref_str,
        user_id=user.id,
        expires_at=new_ref_expiry
    )
    db.add(new_db_ref)
    db.commit()
    
    return TokenResponse(access_token=new_access, refresh_token=new_ref_str)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(ref_req: RefreshRequest, db: Session = Depends(get_db)):
    db_ref = db.query(models.RefreshToken).filter(models.RefreshToken.token == ref_req.refresh_token).first()
    if db_ref:
        db_ref.is_revoked = True
        db.commit()
    return None

@router.get("/me")
def get_me(user: models.User = Depends(get_current_user)):
    import json
    try:
        preferences_dict = json.loads(user.preferences)
    except:
        preferences_dict = {}
        
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "preferences": preferences_dict,
        "has_api_key": user.api_key is not None
    }

@router.put("/me/profile")
def update_profile(profile_data: UserProfileUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    import json
    if profile_data.name is not None:
        user.name = profile_data.name
    if profile_data.preferences is not None:
        user.preferences = json.dumps(profile_data.preferences)
    db.commit()
    return {"status": "profile updated"}

@router.post("/me/api-key", response_model=APIKeyResponse)
def generate_api_key(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_key = f"qt_{uuid.uuid4().hex}"
    user.api_key = new_key
    db.commit()
    return APIKeyResponse(api_key=new_key)

# MOCK/REAL OAuth Callbacks
@router.get("/oauth/google/config")
def google_oauth_config():
    from app.config.settings import settings
    return {
        "enabled": bool(settings.google_client_id and settings.google_client_secret),
        "client_id": settings.google_client_id or "",
        "redirect_uri": settings.google_redirect_uri,
    }

@router.get("/oauth/github/config")
def github_oauth_config():
    from app.config.settings import settings
    return {
        "enabled": bool(settings.github_client_id and settings.github_client_secret),
        "client_id": settings.github_client_id or "",
        "redirect_uri": settings.github_redirect_uri,
    }

class OAuthCallbackRequest(BaseModel):
    code: str
    provider: str

@router.post("/oauth/callback", response_model=TokenResponse)
async def oauth_callback(req: OAuthCallbackRequest, db: Session = Depends(get_db)):
    import httpx
    from app.config.settings import settings

    email = None
    name = None
    oauth_subject = None

    async with httpx.AsyncClient(timeout=15.0) as client:
        if req.provider == "google" and settings.google_client_id and settings.google_client_secret:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": req.code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token")
            profile = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile.raise_for_status()
            data = profile.json()
            email = data.get("email")
            name = data.get("name")
            oauth_subject = data.get("id")
        elif req.provider == "github" and settings.github_client_id and settings.github_client_secret:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "code": req.code,
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "redirect_uri": settings.github_redirect_uri,
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token")
            profile = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile.raise_for_status()
            data = profile.json()
            oauth_subject = str(data.get("id"))
            name = data.get("name") or data.get("login")
            if data.get("email"):
                email = data["email"]
            else:
                emails = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if emails.status_code == 200:
                    primary = next((e for e in emails.json() if e.get("primary")), None)
                    email = (primary or {}).get("email")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"OAuth provider '{req.provider}' not configured. Set client ID/secret in .env.",
            )

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from OAuth provider")

    user = db.query(models.User).filter(
        (models.User.email == email) | (
            (models.User.oauth_provider == req.provider) & (models.User.oauth_subject == oauth_subject)
        )
    ).first()
    if not user:
        user = models.User(
            email=email,
            name=name or email.split("@")[0],
            role="user",
            oauth_provider=req.provider,
            oauth_subject=oauth_subject,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.oauth_provider = req.provider
        user.oauth_subject = oauth_subject
        if name:
            user.name = name
        db.commit()

    access = create_access_token({"sub": user.email, "role": user.role})
    ref_token_str = str(uuid.uuid4())
    ref_expiry = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(models.RefreshToken(token=ref_token_str, user_id=user.id, expires_at=ref_expiry))
    db.commit()
    return TokenResponse(access_token=access, refresh_token=ref_token_str)

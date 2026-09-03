import os
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional

# --- CONFIGURAÇÕES DE SEGURANÇA ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "727ff2d0094a40d08be33a6eda9e3751")
PASSWORD_PEPPER = os.getenv("PASSWORD_PEPPER", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 dias (Estendido para estabilidade da interface)

try:
    pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
    # Testa se o backend do argon2 está ativo
    _probe = pwd_context.hash("probe_argon2")
except Exception:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _apply_pepper(password: str) -> str:
    """
    Aplica Pepper global via HMAC-SHA256 à senha antes do hash.
    Isso blinda a senha contra vazamentos do banco de dados (mantido fora do DB).
    """
    if not PASSWORD_PEPPER:
        return password
    return hmac.new(
        PASSWORD_PEPPER.encode("utf-8"),
        password.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def get_password_hash(password: str) -> str:
    """Gera hash seguro Argon2id com Salt aleatório e Pepper global."""
    peppered = _apply_pepper(password)
    return pwd_context.hash(peppered)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha informada confere com o hash.
    Possui retrocompatibilidade para validar senhas com Pepper (padrão)
    e senhas antigas sem Pepper (hashes legados em Bcrypt ou texto).
    """
    if not hashed_password or not plain_password:
        return False
    
    # 1. Validação padrão com Pepper (Argon2id ou hashes recentes)
    try:
        peppered = _apply_pepper(plain_password)
        if pwd_context.verify(peppered, hashed_password):
            return True
    except Exception:
        pass
    
    # 2. Fallback de retrocompatibilidade para senhas legadas salvas sem Pepper
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except Exception:
        pass
    
    return False

def needs_password_rehash(hashed_password: str) -> bool:
    """
    Indica se o hash precisa ser migrado para o padrão atual (Argon2id + Pepper).
    Retorna True se for Bcrypt antigo ($2b$, $2a$) ou se o contexto indicar atualização.
    """
    if not hashed_password:
        return True
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        return True
    try:
        return pwd_context.needs_update(hashed_password)
    except Exception:
        return True

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def mask_sensitive_data(data: str) -> str:
    if not data: return data
    if "@" in data: # Email
        parts = data.split("@")
        return f"{parts[0][:2]}***@{parts[1]}"
    return f"{data[:2]}***" if len(data) > 2 else "***"

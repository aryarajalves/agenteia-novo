"""
Testes unitários para api/services/auth_service.py

Valida criação de tokens JWT, hashing de senha e
utilitários de mascaramento de dados sensíveis.
"""
import pytest
from datetime import timedelta, datetime, timezone
from unittest.mock import patch
from jose import jwt

from api.services.auth_service import (
    verify_password,
    get_password_hash,
    needs_password_rehash,
    create_access_token,
    mask_sensitive_data,
    SECRET_KEY,
    PASSWORD_PEPPER,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    pwd_context,
)


class TestPasswordHashing:
    def test_hash_different_from_plain(self):
        hashed = get_password_hash("minha_senha")
        assert hashed != "minha_senha"

    def test_verify_correct_password(self):
        hashed = get_password_hash("senha123")
        assert verify_password("senha123", hashed) is True

    def test_reject_wrong_password(self):
        hashed = get_password_hash("senha123")
        assert verify_password("outrasenha", hashed) is False

    def test_hash_format_argon2id(self):
        hashed = get_password_hash("qualquer")
        assert hashed.startswith("$argon2id$") or hashed.startswith("$argon2")

    def test_same_password_produces_different_hashes(self):
        h1 = get_password_hash("senha")
        h2 = get_password_hash("senha")
        # Argon2id gera salt aleatório a cada chamada
        assert h1 != h2

    def test_pepper_affects_hash(self):
        with patch("api.services.auth_service.PASSWORD_PEPPER", "pepper_a"):
            h_a = get_password_hash("senha_teste")
        with patch("api.services.auth_service.PASSWORD_PEPPER", "pepper_b"):
            h_b = get_password_hash("senha_teste")
        # Hashes com peppers diferentes não devem validar entre si
        with patch("api.services.auth_service.PASSWORD_PEPPER", "pepper_b"):
            assert verify_password("senha_teste", h_a) is False
            assert verify_password("senha_teste", h_b) is True

    def test_legacy_bcrypt_compatibility(self):
        # Hash Bcrypt legítimo gerado sem pepper (legado)
        legacy_bcrypt_hash = "$2b$12$e86gJ03q9A1vQv3oO65h..iH0bMvDkWyMpv1gK0e5l7s0n8V5Zz8q"
        # Testamos gerando um hash bcrypt direto pelo contexto para garantir validade
        from passlib.hash import bcrypt
        real_bcrypt_hash = bcrypt.hash("senha_legada_123")
        assert verify_password("senha_legada_123", real_bcrypt_hash) is True
        assert verify_password("senha_errada", real_bcrypt_hash) is False

    def test_needs_password_rehash(self):
        from passlib.hash import bcrypt
        bcrypt_hash = bcrypt.hash("senha123")
        argon2_hash = get_password_hash("senha123")
        
        # Hash bcrypt precisa ser rehasheado para o novo padrão Argon2id
        assert needs_password_rehash(bcrypt_hash) is True
        # Hash Argon2id atual não precisa de rehash
        assert needs_password_rehash(argon2_hash) is False
        assert needs_password_rehash("") is True
        assert needs_password_rehash(None) is True


class TestJWTTokenCreation:
    def test_token_created_successfully(self):
        token = create_access_token(data={"sub": "user@test.com"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_contains_sub(self):
        token = create_access_token(data={"sub": "user@test.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "user@test.com"

    def test_token_has_expiration(self):
        token = create_access_token(data={"sub": "user@test.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_custom_expiration_delta(self):
        delta = timedelta(minutes=5)
        before = datetime.now(timezone.utc)
        token = create_access_token(data={"sub": "u@test.com"}, expires_delta=delta)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        after = datetime.now(timezone.utc)
        # expiração deve ser ~5min a partir de agora
        assert (exp - before).total_seconds() <= 300 + 2
        assert (exp - after).total_seconds() >= 298

    def test_default_expiration_is_configured_correctly(self):
        token = create_access_token(data={"sub": "u@test.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        diff_minutes = (exp - now).total_seconds() / 60
        # Deve ser próximo de 43200 minutos (30 dias)
        assert (ACCESS_TOKEN_EXPIRE_MINUTES - 10) <= diff_minutes <= (ACCESS_TOKEN_EXPIRE_MINUTES + 10)

    def test_extra_data_preserved_in_token(self):
        token = create_access_token(data={"sub": "u@test.com", "role": "admin"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload.get("role") == "admin"


class TestMaskSensitiveData:
    def test_mask_email(self):
        result = mask_sensitive_data("usuario@dominio.com")
        assert "***" in result
        assert "@dominio.com" in result
        assert result.startswith("us")

    def test_mask_short_string(self):
        result = mask_sensitive_data("ab")
        assert result == "***"

    def test_mask_regular_string(self):
        result = mask_sensitive_data("telefone123")
        assert result.startswith("te")
        assert "***" in result

    def test_empty_string_returns_as_is(self):
        result = mask_sensitive_data("")
        assert result == ""

    def test_none_returns_none(self):
        result = mask_sensitive_data(None)
        assert result is None


class TestConstants:
    def test_algorithm_is_hs256(self):
        assert ALGORITHM == "HS256"

    def test_expire_minutes_is_configured(self):
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 60 * 24 * 30

    def test_secret_key_not_empty(self):
        assert len(SECRET_KEY) > 0

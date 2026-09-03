"""
main.py — Proxy de Compatibilidade (Legado)
============================================
Este arquivo existe apenas para compatibilidade retroativa.

O entrypoint real da aplicação agora é:
    api/main.py  →  gunicorn api.main:app

Qualquer código que importava de `main` diretamente (ex: testes legados)
continua funcionando através deste proxy.

⚠️  NÃO adicione lógica nova aqui. Use api/routers/ e api/schemas.py.
"""

# Re-exporta o app central para compatibilidade (ex: testes que fazem `from main import app`)
from api.main import app  # noqa: F401

# Re-exporta funções que testes legados ainda referenciam diretamente
# Se precisar de novas funções aqui, mova-as para api/services/ e importe de lá.
try:
    from api.deps import verify_api_key, get_db, get_current_user  # noqa: F401
except ImportError:
    pass

try:
    from api.schemas import (  # noqa: F401
        AgentConfig, KnowledgeBase, KnowledgeItem,
        MessageRequest, MessageResponse,
    )
except ImportError:
    pass

# Re-exporta funções e constantes de autenticação (usadas por testes legados)
from api.services.auth_service import (  # noqa: F401
    create_access_token, SECRET_KEY, PASSWORD_PEPPER, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    verify_password, get_password_hash, needs_password_rehash
)


# Funções que testes legados importam diretamente e ainda não foram movidas para api/
# TODO: mover cada uma dessas para um serviço dedicado em api/services/
async def list_support_requests(*args, **kwargs):
    """Proxy legado — implementação real em api/routers/knowledge.py."""
    raise NotImplementedError("Use api/routers/ diretamente.")


async def internal_resolve_support(*args, **kwargs):
    """Proxy legado — implementação real em api/routers/knowledge.py."""
    raise NotImplementedError("Use api/routers/ diretamente.")

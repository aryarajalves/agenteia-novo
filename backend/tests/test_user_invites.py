import pytest
import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select
from models import UserInviteModel, UserModel

@pytest.mark.asyncio
async def test_create_invite_flow(client: AsyncClient):
    # 1. Login como admin
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar um convite
    invite_data = {
        "role": "Admin",
        "validity_hours": 24
    }
    response = await client.post("/users/invites", json=invite_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "Admin"
    assert "token" in data
    assert data["is_used"] is False

    invite_token = data["token"]

    # 3. Validar convite publicamente
    val_res = await client.get(f"/users/invites/validate/{invite_token}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["role"] == "Admin"

    # 4. Listar convites
    list_res = await client.get("/users/invites", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
    tokens_list = [inv["token"] for inv in list_res.json()]
    assert invite_token in tokens_list

    # 5. Registrar novo usuário usando o convite
    uid = random.randint(10000, 99999)
    register_data = {
        "name": f"Convidado {uid}",
        "email": f"invited_{uid}@example.com",
        "password": "Password123!"
    }
    reg_res = await client.post(f"/users/register/{invite_token}", json=register_data)
    assert reg_res.status_code == 200
    assert reg_res.json()["success"] is True

    # 6. Tentar usar o mesmo convite novamente (deve falhar)
    reg_res_dup = await client.post(f"/users/register/{invite_token}", json=register_data)
    assert reg_res_dup.status_code == 400
    assert "já foi utilizado" in reg_res_dup.json()["detail"]

    # 7. Validar se o usuário consegue logar
    login_user_res = await client.post("/login", json={
        "email": f"invited_{uid}@example.com",
        "password": "Password123!"
    })
    assert login_user_res.status_code == 200
    assert login_user_res.json()["user"]["role"] == "Admin"

@pytest.mark.asyncio
async def test_invite_validation_errors(client: AsyncClient):
    # Testar token inexistente
    val_res = await client.get(f"/users/invites/validate/{uuid.uuid4()}")
    assert val_res.status_code == 404

    # Testar token expirado (usando o DB diretamente para expirar)
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    invite_data = {
        "role": "Usuário",
        "validity_hours": -1 # Expira no passado
    }
    create_res = await client.post("/users/invites", json=invite_data, headers=headers)
    assert create_res.status_code == 200
    expired_token = create_res.json()["token"]

    # Deve falhar validação pública
    val_res_exp = await client.get(f"/users/invites/validate/{expired_token}")
    assert val_res_exp.status_code == 400
    assert "expirou" in val_res_exp.json()["detail"]

    # Deve falhar registro em convite expirado
    reg_res_exp = await client.post(f"/users/register/{expired_token}", json={
        "name": "Falho",
        "email": "falho@example.com",
        "password": "Password123!"
    })
    assert reg_res_exp.status_code == 400

@pytest.mark.asyncio
async def test_password_strength_validation(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post("/users/invites", json={"role": "Usuário", "validity_hours": 24}, headers=headers)
    invite_token = create_res.json()["token"]

    # Senha curta (< 10 chars)
    res_short = await client.post(f"/users/register/{invite_token}", json={
        "name": "Teste", "email": "teste1@example.com", "password": "Pass1!"
    })
    assert res_short.status_code == 422

    # Senha sem número
    res_no_num = await client.post(f"/users/register/{invite_token}", json={
        "name": "Teste", "email": "teste2@example.com", "password": "PasswordSpecial!"
    })
    assert res_no_num.status_code == 422

    # Senha sem caractere especial
    res_no_spec = await client.post(f"/users/register/{invite_token}", json={
        "name": "Teste", "email": "teste3@example.com", "password": "Password1234"
    })
    assert res_no_spec.status_code == 422

@pytest.mark.asyncio
async def test_invite_revocation(client: AsyncClient):
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Criar
    create_res = await client.post("/users/invites", json={"role": "Usuário", "validity_hours": 24}, headers=headers)
    invite_token = create_res.json()["token"]

    # Deletar
    del_res = await client.delete(f"/users/invites/{invite_token}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Validar que sumiu
    val_res = await client.get(f"/users/invites/validate/{invite_token}")
    assert val_res.status_code == 404

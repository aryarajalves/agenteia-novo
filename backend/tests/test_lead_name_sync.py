import pytest
from datetime import datetime, timedelta
from webhooks.service import upsert_lead, ensure_leads_table
from database.connection import engine_sync
from sqlalchemy import text

@pytest.mark.asyncio
async def test_upsert_lead_preserves_and_updates_real_name():
    """Valida se o upsert_lead atualiza o nome quando um nome real vem do webhook e não sobrescreve com Lead_XXXX ou Contato Desconhecido se o nome real já existir."""
    table_name = "test_leads_name_sync"
    await ensure_leads_table(table_name)
    
    # 1. Inserir lead sem nome (apenas telefone)
    data1 = {
        "telefone": "5585996123586",
        "contato_nome": "Contato Desconhecido",
        "mensagem": "Primeira mensagem"
    }
    await upsert_lead(table_name, data1, 1)
    
    with engine_sync.connect() as conn:
        res = conn.execute(text(f"SELECT contato_nome FROM {table_name} WHERE telefone = '5585996123586'")).fetchone()
        assert res[0] == "Lead_3586"
        
    # 2. Receber webhook com nome real "Aryaraj" -> Deve atualizar o nome!
    data2 = {
        "telefone": "5585996123586",
        "contato_nome": "Aryaraj",
        "mensagem": "Segunda mensagem"
    }
    await upsert_lead(table_name, data2, 1)
    
    with engine_sync.connect() as conn:
        res = conn.execute(text(f"SELECT contato_nome FROM {table_name} WHERE telefone = '5585996123586'")).fetchone()
        assert res[0] == "Aryaraj"

    # 3. Receber webhook futuro sem nome ou com "Contato Desconhecido" -> NÃO DEVE SOBRESCREVER "Aryaraj"!
    data3 = {
        "telefone": "5585996123586",
        "contato_nome": "Contato Desconhecido",
        "mensagem": "Terceira mensagem"
    }
    await upsert_lead(table_name, data3, 1)
    
    # 4. Receber webhook de Outra Plataforma (Memória) que envia "Lead_3586" -> NÃO DEVE SOBRESCREVER "Aryaraj"!
    data4 = {
        "telefone": "5585996123586",
        "contato_nome": "Lead_3586",
        "mensagem": "Mensagem da outra plataforma"
    }
    await upsert_lead(table_name, data4, 1)
    
    with engine_sync.connect() as conn:
        res = conn.execute(text(f"SELECT contato_nome FROM {table_name} WHERE telefone = '5585996123586'")).fetchone()
        assert res[0] == "Aryaraj"
        
    # Limpeza
    with engine_sync.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))

@pytest.mark.asyncio
async def test_upsert_lead_preserves_labels_and_window_on_memory():
    """Valida se o upsert_lead mantem as etiquetas existentes intactas e NAO reseta a janela de 24h ao receber um webhook de memoria (Outra Plataforma)."""
    table_name = "test_leads_labels_memory"
    await ensure_leads_table(table_name)
    
    # 1. Inserir lead inicial com etiquetas e uma data de última mensagem específica no passado
    initial_labels = '["whatsapp", "robo", "24-horas"]'
    past_window_time = datetime.utcnow() - timedelta(hours=5)
    
    data_user = {
        "telefone": "5585996123586",
        "contato_nome": "Aryaraj",
        "labels": initial_labels,
        "mensagem": "Mensagem real do usuario"
    }
    await upsert_lead(table_name, data_user, 1)
    
    # Forçar no banco a data da ultima_mensagem_em para a data passada
    with engine_sync.begin() as conn:
        conn.execute(text(f"UPDATE {table_name} SET ultima_mensagem_em = :past_time WHERE telefone = '5585996123586'"), {"past_time": past_window_time})
        
    with engine_sync.connect() as conn:
        res = conn.execute(text(f"SELECT labels, ultima_mensagem_em FROM {table_name} WHERE telefone = '5585996123586'")).fetchone()
        assert res[0] == initial_labels
        saved_time = res[1]

    # 2. Receber um webhook de memoria / outra plataforma (sem labels e com is_memory=True)
    memory_data = {
        "telefone": "5585996123586",
        "mensagem": "Mensagem vinda da memoria",
        "is_memory": True,
        "dono": "outro"
    }
    await upsert_lead(table_name, memory_data, 1)
    
    with engine_sync.connect() as conn:
        res = conn.execute(text(f"SELECT labels, ultima_mensagem_em FROM {table_name} WHERE telefone = '5585996123586'")).fetchone()
        # As etiquetas DEVEM continuar sendo ["whatsapp", "robo", "24-horas"]
        assert res[0] == initial_labels
        # A data da janela de 24h NAO DEVE ter sido alterada!
        assert res[1] == saved_time
        
    # Limpeza
    with engine_sync.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))

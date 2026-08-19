import pytest
import json
from datetime import datetime
from sqlalchemy import text
from database import SessionLocal
from tasks import _save_followup_event

def test_save_followup_event_records_to_webhook_events():
    db = SessionLocal()
    test_phone = "5511988887777"
    try:
        # Limpar registros anteriores de teste
        db.execute(text("DELETE FROM webhook_events WHERE telefone = :tel"), {"tel": test_phone})
        db.commit()

        # Buscar um webhook_config_id válido existente no banco ou criar um
        cfg = db.execute(text("SELECT id FROM webhook_configs LIMIT 1")).fetchone()
        if cfg:
            config_id = cfg[0]
        else:
            res_cfg = db.execute(text("INSERT INTO webhook_configs (name, token, leads_table) VALUES ('Test Config', 'token123', 'leads') RETURNING id"))
            config_id = res_cfg.fetchone()[0]
            db.commit()

        pipeline_steps = [{"step": "Teste", "detail": "Disparo efetuado", "timestamp": datetime.utcnow().isoformat()}]
        followup_msg = "Olá! Como posso te ajudar a concluir sua inscrição?"

        # Registrar o evento de follow-up processado
        _save_followup_event(
            db=db,
            config_id=config_id,
            conta_id=10,
            conversa_id=2025,
            telefone=test_phone,
            nome="Lead Teste",
            message=followup_msg,
            steps=pipeline_steps,
            status="processed",
            step_index=0
        )

        # Verificar se foi inserido na tabela webhook_events
        row = db.execute(text("""
            SELECT id, webhook_config_id, conversa_id, telefone, mensagem, agent_response, dono, status, event_type 
            FROM webhook_events 
            WHERE telefone = :tel 
            ORDER BY id DESC LIMIT 1
        """), {"tel": test_phone}).fetchone()

        assert row is not None
        assert row[1] == config_id  # webhook_config_id
        assert row[3] == test_phone
        assert "Follow-Up Passo #1" in row[4]  # mensagem (ex: 🔄 [Follow-Up Passo #1])
        assert row[5] == followup_msg  # agent_response
        assert row[6] == "Agente"  # dono
        assert row[7] == "processed"
        assert row[8] == "followup"

    finally:
        # Limpeza pós-teste
        try:
            db.rollback()
            db.execute(text("DELETE FROM webhook_events WHERE telefone = :tel"), {"tel": test_phone})
            db.commit()
        except Exception:
            pass
        db.close()

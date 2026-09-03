import os
import sys
import uuid

# Adiciona o diretório backend ao path para conseguir importar os módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import WebhookConfigModel

def main():
    with SessionLocal() as session:
        # Verificar se já existe algum webhook cadastrado
        existing = session.query(WebhookConfigModel).first()
        if not existing:
            config = WebhookConfigModel(
                name="Integração WhatsApp & ZapVoice",
                token=uuid.uuid4().hex,
                memory_token=uuid.uuid4().hex,
                leads_table="leads",
                delete_keywords="resetar,limpar,#resetar,#reset",
                delete_labels="[\"Aguardando Agente\", \"Reset Concluído\"]"
            )
            session.add(config)
            session.commit()
            print("✨ Webhook padrão criado com sucesso no banco de desenvolvimento!")
        else:
            print("Já existe um webhook de integração cadastrado no banco de desenvolvimento.")

if __name__ == "__main__":
    main()

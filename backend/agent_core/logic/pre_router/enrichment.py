import logging
import re

logger = logging.getLogger(__name__)

async def enrich_user_message(message: str, history: list, client) -> str:
    """Enriquece a mensagem atual com base no histórico de conversas recente (Query Enrichment)."""
    if not history or not message.strip():
        return message

    # Se a mensagem contiver um e-mail do usuário, NUNCA reescrevemos
    if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', message):
        return message

    # Se a mensagem já for estruturada (>70 chars ou >10 palavras), não reescrevemos
    words = message.strip().split()
    if len(message.strip()) > 70 or len(words) > 10:
        return message

    # Se a mensagem já tiver assunto explícito e não contiver pronomes vagos, não reescrevemos
    vague_pronouns = {"ele", "ela", "eles", "elas", "isso", "aquilo", "dele", "dela", "deles", "delas", "nele", "nela", "nisso"}
    msg_words_lower = {w.strip("?!.,:;-_()[]{}").lower() for w in words}
    if len(words) >= 5 and not (msg_words_lower & vague_pronouns):
        if any(term in message.lower() for term in ["sobre", "curso", "método", "metodo", "laser", "tatuagem", "micropigmentação", "valor", "preço"]):
            return message

    # Se a mensagem for uma confirmação ou encerramento puro, não reescrevemos
    msg_clean_check = message.strip().lower()
    for char in ["?", "!", ".", ",", ";", ":", "-", "_", "(", ")", "[", "]", "{", "}"]:
        msg_clean_check = msg_clean_check.replace(char, "")
    msg_clean_check = re.sub(r'\s+', ' ', msg_clean_check).strip()

    confirmation_closings = [
        "ta bom", "tá bom", "ta bem", "tá bem", "tudo bem", "tudo bom",
        "ok", "entendi", "tendi", "certo", "beleza", "blz", "perfeito", "combinado",
        "fechado", "tá certo", "ta certo", "ótimo", "otimo", "tá ótimo", "ta otimo",
        "maravilha", "belezinha", "tá joia", "ta joia", "joia", "jóia", "combinadíssimo", "combinadissimo",
        "nao", "não", "nao.", "não.", "nenhuma", "nenhum", "nada", "nada mais",
        "nao preciso", "não preciso", "nao obrigado", "não obrigado", "nao obrigada", "não obrigada",
        "por enquanto nao", "por enquanto não"
    ]
    if msg_clean_check in confirmation_closings:
        return message

    history_text = ""
    for h in history:
        role = (h.get('role') if isinstance(h, dict) else getattr(h, 'role', 'user')).upper()
        content = (h.get('content') if isinstance(h, dict) else getattr(h, 'content', ''))
        history_text += f"{role}: {content}\n\n"

    system_prompt = (
        "Você é um assistente especializado em enriquecimento e desambiguação de mensagens de clientes (Query Enrichment).\n"
        "Sua função é APENAS desambiguar perguntas vagas e pronomes indefinidos (como 'quanto custa?', 'como funciona?', 'ele tem garantia?', 'onde fica?') substituindo pronomes pelo produto ou assunto citado no histórico recente.\n\n"
        "⚠️ REGRAS CRÍTICAS E OBRIGATÓRIAS:\n"
        "1. MENSAGEM JÁ COMPLETA: Se a mensagem do usuário já for clara e tiver o assunto explícito (Ex: 'Olá! Quero saber mais sobre o método laser day', 'Qual o preço do curso?'), RETORNE A MENSAGEM EXATA DO USUÁRIO sem alterar nada.\n"
        "2. PROIBIDO INVERTER PAPÉIS OU COPIAR PERGUNTAS DO ATENDENTE: NUNCA insira perguntas de encerramento do atendente (como 'Posso ajudar em algo mais?', 'Qual sua dúvida?', 'Como posso ajudar?') na mensagem do usuário. O usuário é o CLIENTE, ele nunca pergunta se pode ajudar o atendente.\n"
        "3. PROIBIDO COPIAR PARÁGRAFOS EXPLICATIVOS DO ASSISTENTE: NUNCA copie a resposta explicativa anterior do assistente para a mensagem do usuário.\n"
        "4. RESPOSTA A OFERTAS: Se o usuário responder apenas uma confirmação curta (Ex: 'Sim', 'Quero', 'Gostaria', 'Manda', 'Tenho interesse') para uma pergunta em que o assistente ofereceu algo específico (Ex: 'Quer o link?', 'Quer saber os valores?'), transforme APENAS na solicitação objetiva do usuário (Ex: 'O cliente quer o link de inscrição' ou 'Quero saber os valores'). NUNCA aplique essa regra se a mensagem já trouxer sua própria dúvida ou assunto.\n"
        "5. NUNCA invente perguntas ou informações não solicitadas pelo cliente.\n\n"
        "Retorne APENAS a mensagem resultante, sem aspas e sem explicações."
    )
    user_prompt = f"{history_text}\nMENSAGEM ATUAL DO USUÁRIO:\n{message}"

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            max_tokens=200
        )
        enriched = response.choices[0].message.content.strip()
        if enriched:
            if enriched.startswith('"') and enriched.endswith('"'):
                enriched = enriched[1:-1]
            
            # Salvaguarda: Se a IA inverteu papéis inserindo perguntas típicas de atendente, rejeita e mantém a mensagem original
            attendant_phrases = [
                "posso ajudar", "como posso ajudar", "posso te ajudar", "alguma dúvida",
                "mais alguma dúvida", "posso ajudar você", "em que posso ajudar", "qual sua dúvida"
            ]
            if any(phrase in enriched.lower() for phrase in attendant_phrases):
                logger.warning(f"⚠️ [ENRICHMENT] Detectada inversão de papéis no enriquecimento: '{enriched[:80]}...'. Mantendo mensagem original.")
                enriched = message
            
            # Garantia determinística em Python para respostas verdadeiramente curtas de interesse ("Gostaria", "Quero", "Sim", etc.)
            msg_clean = message.strip().lower()
            words_count = len(msg_clean.split())
            if words_count <= 4 or len(msg_clean) <= 25:
                short_interest_words = ["gostaria", "quero", "sim", "pode ser", "gostaria sim", "aceito", "gostaria de saber", "manda", "envia", "mande", "envie"]
                if any(msg_clean == w or msg_clean.startswith(w) for w in short_interest_words):
                    last_assistant_msg = ""
                    for h in reversed(history):
                        role = (h.get('role') if isinstance(h, dict) else getattr(h, 'role', '')).lower()
                        content = (h.get('content') if isinstance(h, dict) else getattr(h, 'content', ''))
                        if role == "assistant" and content:
                            last_assistant_msg = str(content).lower()
                            break

                    if last_assistant_msg:
                        parts = ["mais informações sobre o curso"]
                        if ("pagamento" in last_assistant_msg or "pagamentos" in last_assistant_msg) and "pagamento" not in enriched.lower():
                            parts.append("sobre as formas de pagamento")
                        if ("link" in last_assistant_msg or "compra" in last_assistant_msg or "inscrição" in last_assistant_msg) and ("link" not in enriched.lower() and "compra" not in enriched.lower()):
                            parts.append("do link de compra / inscrição")

                        if len(parts) > 1:
                            enriched = f"Gostaria de {', '.join(parts[:-1])} e {parts[-1]}."

            return enriched
    except Exception as e:
        logger.error(f"Erro ao enriquecer mensagem no pre-router: {e}")
    return message


async def _get_kb_reference_context(main_agent, message: str, async_db=None):
    """Recupera contexto de referência da Base de Conhecimento para alinhar a reescrita de perguntas do Pre-Router."""
    if not main_agent or not message or not message.strip():
        return "", {
            "fase": "⚠️ Mensagem Vazia ou Agente Ausente",
            "status": "vazio",
            "perguntas_referencia": [],
            "custo": "R$ 0,00"
        }

    try:
        from database import async_session
        from models import KnowledgeItemModel, AgentConfigModel
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        async def _fetch(db_session):
            agent_id = getattr(main_agent, 'id', None)
            kb_ids = []
            if agent_id:
                try:
                    stmt_agent = select(AgentConfigModel).options(selectinload(AgentConfigModel.knowledge_bases)).where(AgentConfigModel.id == agent_id)
                    res_agent = await db_session.execute(stmt_agent)
                    agent_obj = res_agent.scalars().first()
                    if agent_obj:
                        kb_ids = [kb.id for kb in agent_obj.knowledge_bases] or ([agent_obj.knowledge_base_id] if agent_obj.knowledge_base_id else [])
                except Exception as e_ag:
                    logger.warning(f"Erro ao buscar agent_obj no _fetch: {e_ag}")
            
            if not kb_ids:
                kb_ids = [kb.id for kb in getattr(main_agent, 'knowledge_bases', [])] or ([main_agent.knowledge_base_id] if getattr(main_agent, 'knowledge_base_id', None) else [])

            if not kb_ids:
                return "", {
                    "fase": "⚠️ Nenhuma Base de Conhecimento Vinculada",
                    "status": "sem_base",
                    "perguntas_referencia": [],
                    "detalhe": f"O agente '{getattr(main_agent, 'name', 'Principal')}' (ID: {agent_id}) não possui nenhuma Base de Conhecimento vinculada.",
                    "custo": "R$ 0,00"
                }

            # Carrega catálogo de perguntas via SQL sem realizar embeddings/busca vetorial antes do Pre-Router
            stmt = select(KnowledgeItemModel.question).where(KnowledgeItemModel.knowledge_base_id.in_(kb_ids))
            res = await db_session.execute(stmt)
            all_questions = [q for q in res.scalars().all() if q and q.strip()]

            if all_questions:
                ctx = "\n### BASE DE CONHECIMENTO CADASTRADA (REFERÊNCIA DE CATÁLOGO PARA ALINHAMENTO):\n"
                ctx += "Utilize o catálogo de perguntas cadastradas abaixo para ALINHAR E REESCREVER a dúvida do usuário no formato de pergunta oficial:\n"
                for idx, q in enumerate(all_questions[:100], 1): # limite defensivo de 100 perguntas
                    ctx += f"{idx}. \"{q}\"\n"

                info = {
                    "fase": "Catálogo de Referência (Pré-Router)",
                    "status": "catalogo_carregado",
                    "perguntas_referencia": all_questions[:100],
                    "usou_fallback": False,
                    "custo": "R$ 0,00 (Busca Vetorial será executada APÓS o Pre-Router)"
                }
                return ctx, info

            return "", {
                "fase": "⚠️ Nenhuma Pergunta Encontrada no Catálogo",
                "status": "catalogo_vazio",
                "perguntas_referencia": [],
                "detalhe": "Nenhum item cadastrado nas bases de conhecimento do agente.",
                "custo": "R$ 0,00"
            }

        from sqlalchemy.ext.asyncio import AsyncSession
        from unittest.mock import AsyncMock
        
        is_real_async = isinstance(async_db, (AsyncSession, AsyncMock)) or getattr(async_db, 'is_async', False)
        if is_real_async:
            return await _fetch(async_db)
        else:
            async with async_session() as db_session:
                return await _fetch(db_session)
    except Exception as e:
        logger.error(f"Erro ao obter contexto de referência da Base de Conhecimento para o Pre-Router: {e}")
        return "", {
            "fase": "❌ Erro Geral de Consulta",
            "status": "erro_geral",
            "perguntas_referencia": [],
            "detalhe": f"Erro inesperado: {str(e)}",
            "custo": "R$ 0,00"
        }

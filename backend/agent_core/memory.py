import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import UserMemoryModel
from .clients import get_openai_client

async def fetch_user_memory(db, session_id: str) -> str:
    if not db or not session_id: return ""
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        stmt = select(UserMemoryModel).where(UserMemoryModel.session_id == session_id).order_by(UserMemoryModel.updated_at.desc())
        if isinstance(db, AsyncSession):
            result = await db.execute(stmt)
        else:
            result = db.execute(stmt)
        memories = result.scalars().all()
        if not memories: return ""
        
        facts_text = "\n# MEMÓRIA ESTRUTURADA E FATOS:\n"
        for i, m in enumerate(memories):
            prefix = "⭐ [PRIORITÁRIO]" if i == 0 else "-"
            facts_text += f"{prefix} {m.key}: {m.value}\n"
        return facts_text
    except Exception as e:
        print(f"⚠️ fetch_user_memory error: {e}")
        return ""

async def update_user_memory(db, session_id: str, new_message: str, response_text: str, on_step=None):
    if not db or not session_id or not new_message: return {}
    client = get_openai_client()
    if not client: return {}
    
    # 1. Carregar variáveis globais configuradas para extração por IA do banco de dados
    from models import GlobalContextVariableModel
    try:
        stmt_vars = select(GlobalContextVariableModel).where(GlobalContextVariableModel.extraction_method == "ai")
        if isinstance(db, AsyncSession):
            res_vars = await db.execute(stmt_vars)
        else:
            res_vars = db.execute(stmt_vars)
        ai_variables = res_vars.scalars().all()
    except Exception as e_vars:
        print(f"⚠️ Erro ao carregar variáveis para extração em update_user_memory: {e_vars}")
        ai_variables = []

    # Carregar valores atuais salvos na memória do usuário para contexto
    existing_mem_dict = {}
    try:
        stmt_mems = select(UserMemoryModel).where(UserMemoryModel.session_id == str(session_id))
        if isinstance(db, AsyncSession):
            res_mems = await db.execute(stmt_mems)
        else:
            res_mems = db.execute(stmt_mems)
        for m in res_mems.scalars().all():
            existing_mem_dict[m.key] = m.value
    except Exception as e_mem:
        print(f"⚠️ Erro ao carregar memórias existentes: {e_mem}")

    # Se houver variáveis para extração com IA, montamos a especificação estruturada no prompt
    variables_spec = ""
    for v in ai_variables:
        variables_spec += f"- Chave: '{v.key}' (Tipo: {v.type})\n  Regra de Extração: {v.extraction_prompt or 'Extrair esta informação do diálogo se mencionada.'}\n\n"

    current_values_text = ""
    if existing_mem_dict:
        current_values_text = "### VALORES ATUALMENTE SALVOS NA MEMÓRIA DO CONTATO:\n"
        for k, v in existing_mem_dict.items():
            current_values_text += f"- {k}: {v}\n"
        current_values_text += "\n"
        
    prompt = (
        f"Você é um assistente de extração de dados estruturados focado em atualizar o perfil do cliente a partir do diálogo.\n"
        f"Analise o diálogo abaixo e extraia as informações correspondentes.\n\n"
        f"Diálogo:\n"
        f"Usuário: {new_message}\n"
        f"Agente: {response_text}\n\n"
    )
    
    if ai_variables:
        prompt += (
            f"{current_values_text}"
            f"### VARIÁVEIS A EXTRAIR:\n"
            f"{variables_spec}"
            f"Instruções:\n"
            f"1. Para cada variável listada acima, tente extrair o valor com base em sua respectiva Regra de Extração.\n"
            f"2. Se não houver informação suficiente no diálogo para preencher a variável, ou se a informação não foi mencionada, retorne null para aquela chave para preservar o valor existente.\n"
            f"3. PERSISTÊNCIA DE MARCOS/FLAGS BOOLEANAS: Se uma variável booleana já estiver como 'True'/'true' na memória (indicando um marco já alcançado, como link_enviado, qualificado, etc.), NÃO a reverta para false em mensagens posteriores a menos que haja cancelamento ou revogação explícita nesta mensagem. Se o fato já ocorreu no passado, retorne true ou null para mantê-lo.\n"
            f"4. Retorne também uma chave 'fatos_gerais' contendo uma lista de outros fatos importantes extraídos que não se encaixam nas variáveis acima.\n"
            f"Retorne APENAS um JSON plano contendo as chaves das variáveis especificadas (com seus respectivos valores extraídos ou null) e a chave 'fatos_gerais'.\n"
        )
    else:
        prompt += (
            "Extraia fatos estruturados importantes do diálogo:\n"
            "Retorne JSON plano contendo fatos gerais importantes identificados como chaves e valores."
        )

    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você é um extrator de dados estruturados. Retorne exclusivamente um objeto JSON plano de acordo com as instruções."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}, 
            temperature=0
        )
        data = json.loads(res.choices[0].message.content)
        if not data: return {}

        # Detecção determinística de URLs no response_text para variáveis de link
        import re
        has_url_in_response = bool(re.search(r'https?://[^\s]+', response_text or ''))
        if has_url_in_response:
            for v in ai_variables:
                if v.type == 'boolean' and ('link' in v.key.lower() or 'link' in (v.extraction_prompt or '').lower()):
                    data[v.key] = True

        # Proteção contra regressão passiva de flags booleanas já consolidadas como True
        for k, v in list(data.items()):
            if v is False or str(v).strip().lower() in ("false", "0"):
                var_meta = next((x for x in ai_variables if x.key == k), None)
                if var_meta and var_meta.type == "boolean":
                    prev_val = str(existing_mem_dict.get(k, "")).strip().lower()
                    if prev_val in ("true", "1"):
                        data[k] = True
        
        # Separar fatos gerais de variáveis mapeadas
        fatos_gerais = {}
        if "fatos_gerais" in data:
            fg = data.pop("fatos_gerais")
            if isinstance(fg, dict):
                fatos_gerais = fg
            elif isinstance(fg, list):
                for idx, fato in enumerate(fg):
                    fatos_gerais[f"fato_extraido_{idx}"] = fato
        
        # Junta todas as extrações
        facts_to_save = {}
        # Primeiramente adicionamos fatos gerais
        for k, v in fatos_gerais.items():
            facts_to_save[k] = v
        # Depois adicionamos as variáveis mapeadas (somente se não forem nulas/vazias)
        for k, v in data.items():
            if v is not None and str(v).strip() != "":
                facts_to_save[k] = v
                
        if not facts_to_save: return {}

        for key, value in facts_to_save.items():
            stmt = select(UserMemoryModel).where(UserMemoryModel.session_id == str(session_id), UserMemoryModel.key == key)
            if isinstance(db, AsyncSession):
                existing_res = await db.execute(stmt)
            else:
                existing_res = db.execute(stmt)
            existing = existing_res.scalars().first()
            if existing:
                existing.value = str(value)
                existing.source_message = new_message
            else:
                db.add(UserMemoryModel(session_id=str(session_id), key=key, value=str(value), source_message=new_message))
        
        if isinstance(db, AsyncSession):
            await db.commit()
        else:
            db.commit()

        # Identificar variáveis configuradas que foram extraídas e notificar pipeline
        ai_var_keys = {var.key for var in ai_variables}
        newly_extracted_vars = {k: v for k, v in data.items() if k in ai_var_keys and v is not None and str(v).strip() != ""}
        
        if on_step and newly_extracted_vars:
            step_detail = "A IA analisou a mensagem e extraiu dados para as seguintes variáveis configuradas:\n\n"
            for k, val in newly_extracted_vars.items():
                var_meta = next((x for x in ai_variables if x.key == k), None)
                regra = f"\n   ↳ *Regra de Extração:* {var_meta.extraction_prompt}" if var_meta and var_meta.extraction_prompt else ""
                step_detail += f"• **Variável `{k}`**: `{val}`{regra}\n"
            step_detail += f"\n💬 **Trecho analisado:** \"{new_message}\""
            on_step("✨ Informações Extraídas do Usuário (Variáveis)", step_detail)
            
        return facts_to_save
            
    except Exception as e:
        print(f"⚠️ update_user_memory error: {e}")
        return {}


async def delete_all_user_memory(db, session_id: str):
    """Remove toda a memória do usuário (ex: após transbordo completo)."""
    if not db or not session_id: return
    try:
        from sqlalchemy import delete
        from sqlalchemy.ext.asyncio import AsyncSession
        stmt = delete(UserMemoryModel).where(UserMemoryModel.session_id == session_id)
        if isinstance(db, AsyncSession):
            await db.execute(stmt)
            await db.commit()
        else:
            db.execute(stmt)
            db.commit()
    except Exception as e:
        print(f"⚠️ delete_all_user_memory error: {e}")

async def delete_user_memory_by_keys(db, session_id: str, keys: list):
    """Remove chaves específicas da memória do usuário."""
    if not db or not session_id or not keys: return
    try:
        from sqlalchemy import delete
        from sqlalchemy.ext.asyncio import AsyncSession
        stmt = delete(UserMemoryModel).where(UserMemoryModel.session_id == session_id).where(UserMemoryModel.key.in_(keys))
        if isinstance(db, AsyncSession):
            await db.execute(stmt)
            await db.commit()
        else:
            db.execute(stmt)
            db.commit()
    except Exception as e:
        print(f"⚠️ delete_user_memory_by_keys error: {e}")

async def extract_target_variable_early(
    db, session_id: str, message: str, history: list = None,
    target_key: str = None, on_step=None
) -> tuple:
    """
    Extrai antecipadamente uma variável-alvo (ex: curso_interesse ou produto_interesse)
    a partir da mensagem atual e histórico ANTES da execução da busca no RAG.
    Salva imediatamente na memória UserMemoryModel para persistência.
    
    Retorna (chave_variavel, valor_extraido) ou (None, None).
    """
    if not message or not message.strip():
        return None, None

    try:
        from models import GlobalContextVariableModel, UserMemoryModel
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import AsyncSession

        # 1. Localizar a variável de contexto configurada
        target_var = None
        if target_key and target_key.strip():
            stmt = select(GlobalContextVariableModel).where(GlobalContextVariableModel.key == target_key.strip())
            res = await db.execute(stmt) if isinstance(db, AsyncSession) else db.execute(stmt)
            target_var = res.scalars().first()
        else:
            stmt = select(GlobalContextVariableModel).where(GlobalContextVariableModel.extraction_method == "ai")
            res = await db.execute(stmt) if isinstance(db, AsyncSession) else db.execute(stmt)
            ai_vars = res.scalars().all()
            for v in ai_vars:
                k_lower = v.key.lower()
                if any(term in k_lower for term in ["curso", "produto", "plano", "mentoria"]):
                    target_var = v
                    break
            if not target_var and ai_vars:
                target_var = ai_vars[0]

        if not target_var:
            return None, None

        # 2. Verificar se já existe valor salvo na memória para esta sessão
        if session_id:
            stmt_mem = select(UserMemoryModel).where(
                UserMemoryModel.session_id == str(session_id),
                UserMemoryModel.key == target_var.key
            )
            res_mem = await db.execute(stmt_mem) if isinstance(db, AsyncSession) else db.execute(stmt_mem)
            existing_mem = res_mem.scalars().first()
            if existing_mem and existing_mem.value and str(existing_mem.value).strip() not in ["", "None", "null"]:
                return target_var.key, str(existing_mem.value).strip()

        # 3. Extrair via IA a partir da mensagem e histórico
        client = get_openai_client()
        if not client:
            return target_var.key, None

        history_context = ""
        if history:
            history_context = "HISTÓRICO DA CONVERSA:\n"
            for h in history[-4:]:
                r = h.get('role', 'user').upper()
                c = h.get('content', '')
                history_context += f"{r}: {c}\n"
            history_context += "\n"

        rule = target_var.extraction_prompt or f"Identifique o nome do {target_var.key} mencionado pelo cliente."
        sys_prompt = (
            f"Você é um assistente especializado em extração de entidades.\n"
            f"Sua missão é extrair especificamente a informação: '{target_var.key}' (Tipo: {target_var.type}).\n"
            f"Regra de extração: {rule}\n"
            f"Se a informação for mencionada ou puder ser inferida com clareza do diálogo, retorne o nome oficial extraído.\n"
            f"Se a informação não for mencionada nem estiver clara, retorne null.\n"
            f"Retorne APENAS um JSON no formato:\n{{\"valor\": string or null}}"
        )

        user_content = f"{history_context}MENSAGEM DO CLIENTE:\n\"{message}\""

        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )

        data = json.loads(resp.choices[0].message.content.strip())
        extracted_val = data.get("valor")

        if extracted_val and str(extracted_val).strip() not in ["", "None", "null"]:
            extracted_val = str(extracted_val).strip()
            
            # Persistir na memória se session_id estiver presente
            if session_id and db:
                try:
                    new_mem = UserMemoryModel(
                        session_id=str(session_id),
                        key=target_var.key,
                        value=extracted_val
                    )
                    db.add(new_mem)
                    if isinstance(db, AsyncSession):
                        await db.commit()
                    else:
                        db.commit()
                except Exception as e_save:
                    print(f"⚠️ Erro ao salvar memória em extract_target_variable_early: {e_save}")

            if on_step:
                on_step("✨ Extração Antecipada de Variável", f"Variável `{target_var.key}` identificada antes do RAG: `{extracted_val}`")

            return target_var.key, extracted_val

        return target_var.key, None

    except Exception as e:
        print(f"⚠️ extract_target_variable_early error: {e}")
        return None, None


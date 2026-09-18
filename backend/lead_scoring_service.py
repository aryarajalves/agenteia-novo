import os
import json
import logging
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import AgentConfigModel

logger = logging.getLogger(__name__)

async def calculate_lead_score(db: AsyncSession, agent_id: int, respostas, criteria: str = None) -> dict:
    """
    Calcula o lead score de um contato com base nas respostas dadas e nos critérios de qualificação configurados.
    
    Retorna um dicionário:
    {
        "lead_score": int, (0-13)
        "lead_classification": str, (Quente 🔥, Morno ⚡, Frio ❄️)
        "lead_justification": str
    }
    """
    logger.info(f"Iniciando cálculo de lead score para agente_id={agent_id}...")
    
    # 1. Obter critérios do agente ou do funil específico
    qualification_criteria = criteria
    if not qualification_criteria and db:
        try:
            agent_res = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
            agent = agent_res.scalars().first()
            if agent:
                qualification_criteria = agent.qualification_criteria
        except Exception as e:
            logger.error(f"Erro ao buscar AgentConfig no lead scoring: {e}")

    # Fallback caso não haja critérios definidos pelo usuário
    if not qualification_criteria or not qualification_criteria.strip():
        logger.info(f"Sem critérios customizados de lead scoring para o agente {agent_id}. Classificando lead como Indefinida.")
        return {
            "lead_score": None,
            "lead_classification": "Indefinida",
            "lead_justification": "Critérios de qualificação não definidos para este funil."
        }

    # 2. Formatar respostas
    respostas_formatadas = ""
    try:
        # Se for string, tenta fazer o parse
        if isinstance(respostas, str):
            respostas = json.loads(respostas)
            
        if isinstance(respostas, dict):
            for k, v in respostas.items():
                respostas_formatadas += f"- Pergunta/Campo: {k}\n  Resposta: {v}\n"
        elif isinstance(respostas, list):
            for idx, item in enumerate(respostas):
                if isinstance(item, dict):
                    # Suporta diferentes formatos de chave como question, query, text para a pergunta, e answer, response para a resposta
                    pergunta = item.get("question") or item.get("text") or item.get("pergunta") or f"Pergunta {idx+1}"
                    resposta = item.get("answer") or item.get("response") or item.get("resposta") or item.get("value") or ""
                    respostas_formatadas += f"- Pergunta: {pergunta}\n  Resposta: {resposta}\n"
                else:
                    respostas_formatadas += f"- {item}\n"
        else:
            respostas_formatadas = str(respostas)
    except Exception as e:
        logger.error(f"Erro ao formatar respostas de qualificação no lead scoring: {e}")
        respostas_formatadas = str(respostas)

    # 3. Chamar OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        logger.warning("OPENAI_API_KEY não configurada. Usando score padrão fallback.")
        return {
            "lead_score": 0,
            "lead_classification": "Frio ❄️",
            "lead_justification": "Não foi possível calcular a pontuação do lead pois a chave de API da OpenAI não está configurada."
        }

    system_prompt = f"""Você é um avaliador especialista em qualificação de leads para vendas de mentoria de alto valor.
Seu objetivo é analisar as respostas fornecidas por um lead e, com base nos critérios de qualificação fornecidos pelo administrador, calcular um score de 0 a 13, classificar o lead e fornecer uma breve justificativa.

Critérios de Qualificação:
{qualification_criteria}

Você DEVE responder EXCLUSIVAMENTE com um objeto JSON válido (sem blocos de código markdown ou texto explicativo extra, apenas o JSON bruto) no seguinte formato:
{{
  "lead_score": 8,
  "lead_classification": "Morno ⚡",
  "lead_justification": "O lead possui interesse imediato na mentoria e já tentou outras soluções, porém informou ter um orçamento limitado a R$ 2.000, o que fica ligeiramente abaixo do perfil ideal."
}}

Mapeamento de Classificação Obrigatório (siga este exato padrão visual):
- Se a pontuação se enquadrar como lead bom/ótimo/aprovado: "Quente 🔥"
- Se for intermediário: "Morno ⚡"
- Se for desqualificado/baixo interesse/baixo orçamento: "Frio ❄️"

O valor do score DEVE ser um número inteiro de 0 a 13.
"""

    user_prompt = f"""Perguntas e Respostas Coletadas do Lead:
{respostas_formatadas}
"""

    try:
        client = AsyncOpenAI(api_key=openai_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        result_content = response.choices[0].message.content
        logger.info(f"Resposta da OpenAI para Lead Scoring: {result_content}")
        
        result_json = json.loads(result_content)
        
        # Garante as chaves e limites
        score = int(result_json.get("lead_score", 0))
        # Clamp score entre 0 e 13
        score = max(0, min(13, score))
        
        classification = result_json.get("lead_classification", "Frio ❄️")
        # Normalização simples caso falte o emoji
        if "quente" in classification.lower() and "🔥" not in classification:
            classification = "Quente 🔥"
        elif "morno" in classification.lower() and "⚡" not in classification:
            classification = "Morno ⚡"
        elif "frio" in classification.lower() and "❄️" not in classification:
            classification = "Frio ❄️"
            
        justification = result_json.get("lead_justification", "Justificativa não gerada.")
        
        return {
            "lead_score": score,
            "lead_classification": classification,
            "lead_justification": justification
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular lead score na OpenAI: {e}")
        return {
            "lead_score": 0,
            "lead_classification": "Frio ❄️",
            "lead_justification": f"Erro interno ao calcular o score: {str(e)}"
        }

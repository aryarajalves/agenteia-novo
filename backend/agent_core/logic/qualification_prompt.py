import json
import logging
import re

logger = logging.getLogger(__name__)

def resolve_active_qualification_funnel(config, active_funnel_id: str = None) -> dict:
    """
    Resolve qual funil de qualificação deve ser utilizado para o lead.
    Prioridade:
    1. Funil específico indicado em active_funnel_id (se existir em config.qualification_funnels).
    2. Funil marcado como padrão (is_default=True) em config.qualification_funnels.
    3. Primeiro funil da lista config.qualification_funnels.
    4. Fallback para os campos legados de config (qualification_questions, qualification_labels, etc.).
    """
    raw_funnels = getattr(config, 'qualification_funnels', None)
    funnels_list = []
    if raw_funnels:
        try:
            funnels_list = json.loads(raw_funnels) if isinstance(raw_funnels, str) else raw_funnels
        except Exception:
            funnels_list = []

    if isinstance(funnels_list, list) and len(funnels_list) > 0:
        selected = None
        if active_funnel_id:
            for f in funnels_list:
                if isinstance(f, dict) and str(f.get("id")) == str(active_funnel_id):
                    selected = f
                    break

        if not selected:
            for f in funnels_list:
                if isinstance(f, dict) and f.get("is_default"):
                    selected = f
                    break

        if not selected and isinstance(funnels_list[0], dict):
            selected = funnels_list[0]

        if selected:
            return {
                "id": selected.get("id", "default"),
                "name": selected.get("name", "Principal"),
                "questions": selected.get("questions"),
                "labels": selected.get("labels") or [],
                "labels_to_remove": selected.get("labels_to_remove") or [],
                "final_action": selected.get("final_action"),
                "final_action_trigger": selected.get("final_action_trigger", "all") or "all",
                "criteria": selected.get("criteria")
            }

    # Fallback para campos individuais/legados de agent_config
    return {
        "id": "default",
        "name": "Padrão",
        "questions": getattr(config, 'qualification_questions', None),
        "labels": getattr(config, 'qualification_labels', None),
        "labels_to_remove": getattr(config, 'qualification_labels_to_remove', None) or [],
        "final_action": getattr(config, 'qualification_final_action', None),
        "final_action_trigger": getattr(config, 'qualification_final_action_trigger', 'all') or 'all',
        "criteria": getattr(config, 'qualification_criteria', None)
    }

def build_qualification_prompt(config, tools, context_variables: dict = None, history: list = None) -> str:
    """
    Constrói a seção de prompt de Qualificação de Lead & Sondagem Estratégica.
    Garante diretrizes estritas de chamada única para `lead_qualificado` e
    impede loops de qualificação quando o lead já estiver qualificado.
    Suporta múltiplos funis independentes por lead.
    """
    context_vars = context_variables or {}
    is_already_qualified = context_vars.get("lead_already_qualified", False)
    active_funnel_id = context_vars.get("active_qualification_funnel_id")

    active_funnel = resolve_active_qualification_funnel(config, active_funnel_id)
    final_action = active_funnel.get("final_action")

    # Se o lead já foi qualificado anteriormente no banco de dados
    if is_already_qualified:
        prompt_already = (
            "\n\n🎯 **STATUS DO LEAD: JÁ QUALIFICADO ANTERIORMENTE:**\n"
            "Este contato já concluiu todas as etapas do funil de qualificação anteriormente e suas respostas já estão registradas.\n"
            "- É TERMINANTEMENTE PROIBIDO repetir perguntas de qualificação ou iniciar novo processo de sondagem.\n"
            "- É TERMINANTEMENTE PROIBIDO chamar a ferramenta `lead_qualificado` novamente.\n"
            "- Conduza o atendimento tirando eventuais novas dúvidas através da base de conhecimento (RAG) e avance diretamente para o fechamento/matrícula de forma consultiva e prestativa.\n"
        )
        if final_action and str(final_action).strip():
            target_urls = re.findall(r'https?://[^\s)\]"\']+', str(final_action))
            is_link_already_sent = bool(context_vars.get("link_enviado") in (True, "True", "true", "1", 1))
            if not is_link_already_sent and history:
                for h in history:
                    role = (h.get("role") if isinstance(h, dict) else getattr(h, "role", "")).lower()
                    if role == "assistant":
                        content = str(h.get("content") if isinstance(h, dict) else getattr(h, "content", ""))
                        if target_urls:
                            if any(u in content for u in target_urls):
                                is_link_already_sent = True
                                break
                        elif re.search(r'https?://[^\s]+', content):
                            is_link_already_sent = True
                            break

            if is_link_already_sent:
                prompt_already += (
                    f"\n🎯 **STATUS DO LINK: JÁ ENVIADO ANTERIORMENTE:**\n"
                    f"O link de matrícula/inscrição JÁ FOI ENVIADO para este contato anteriormente na conversa.\n"
                    "- ⛔ É TERMINANTEMENTE PROIBIDO perguntar novamente se pode enviar o link, se o lead quer o link ou fazer perguntas como 'Quer que eu te envie o link?' / 'Pode ser que eu te envie o link?'. O lead já possui o link!\n"
                    "- Diretriz Semântica: Analise o histórico recente. Se você ou o sistema já enviou o link de inscrição/compra anteriormente, NUNCA pergunte novamente se o usuário quer receber o link. Trate o link como já entregue, sane as novas dúvidas e conduza-o para utilizar o link já fornecido acima.\n"
                    "- Se o lead tiver dúvidas adicionais ou relatar inseguranças, tire as dúvidas com total atenção e naturalidade via RAG/conhecimento.\n"
                    "- Ao concluir a resposta, se fizer sentido conduzir para a ação, incentive o lead de forma simpática a acessar o link já enviado acima para garantir a vaga ou pergunte se ficou alguma dúvida sobre a inscrição.\n"
                )
            else:
                prompt_already += (
                    f"\n🎯 **DIRETRIZ DE FECHAMENTO & LINK / OFERTA PÓS-QUALIFICAÇÃO:**\n"
                    f"↳ \"{str(final_action).strip()}\"\n"
                    "REGRAS DE EXECUÇÃO DESTA DIRETRIZ:\n"
                    "- Se o lead confirmou, disse 'sim', 'pode enviar', 'quero o link', ou demonstrou interesse em receber: Você DEVE enviar o link informado na diretriz acima, respeitando integralmente as instruções de formatação solicitadas (ex: quebras de linha, parágrafo separado, sem colchetes/parênteses).\n"
                    "- Se o lead tiver dúvidas ou fizer perguntas antes de confirmar: responda com a base de conhecimento com atenção e ao final renove a pergunta/convite para envio do link.\n"
                    "- ⛔ PROIBIÇÃO DE REPETIR ENVIO DE LINK: Analise o histórico recente. Se você ou o sistema já enviou o link de inscrição/compra anteriormente, NUNCA pergunte novamente se o usuário quer receber o link. Trate o link como já entregue!\n"
                )
        return prompt_already

    has_lead_qualified = any(getattr(t, "name", None) == "lead_qualificado" for t in tools) if tools else False
    raw_qq = active_funnel.get("questions")
    if not raw_qq or not has_lead_qualified:
        return ""

    try:
        qq_list = json.loads(raw_qq) if isinstance(raw_qq, str) else raw_qq
        if not isinstance(qq_list, list) or not qq_list:
            return ""

        qq_lines = []
        for i, q in enumerate(qq_list):
            if isinstance(q, dict):
                title = q.get("title") or q.get("text") or f"Etapa {i+1}"
                instruction = q.get("prompt") or q.get("prompt_instruction") or q.get("instruction") or ""
                criteria = q.get("criteria") or q.get("completion_criteria") or ""
                line = f"{i+1}. [ETAPA: {title}]"
                if instruction:
                    line += f"\n   ↳ Objetivo / Prompt de Sondagem: {instruction}"
                if criteria:
                    line += f"\n   ↳ Critério de Conclusão: {criteria}"
            else:
                line = f"{i+1}. {q}"
            qq_lines.append(line)
        qq_formatted = "\n".join(qq_lines)

        prompt_part = (
            "\n\n🎯 **QUALIFICAÇÃO DE LEAD & SONDAÇÃO ESTRATÉGICA — PROTOCOLO OBRIGATÓRIO:**\n"
            "Você deve conduzir o atendimento através do funil de qualificação abaixo, alcançando cada objetivo de forma 100% natural, fluida e consultiva:\n"
            f"{qq_formatted}\n\n"
            "REGRAS INVIOLÁVEIS DE ATENDIMENTO & TRATAMENTO DOS FLUXOS DO LEAD:\n"
            "1. 🧩 MENSAGEM COMPOSTA (O lead respondeu à pergunta anterior E fez uma nova dúvida):\n"
            "   - Você DEVE primeiro acolher a resposta dele e responder à nova dúvida com total clareza e precisão (usando a base de conhecimento/RAG).\n"
            "   - Em seguida, no mesmo turno, avance para a próxima etapa do funil conectando de forma fluida a pergunta do próximo objetivo.\n"
            "2. 💬 O LEAD APENAS RESPONDEU À SUA PERGUNTA ANTERIOR:\n"
            "   - Acolha e valide a resposta dele de forma simpática, e em seguida faça a pergunta da próxima etapa pendente.\n"
            "2b. 🚫 O LEAD RESPONDEU QUE NÃO TEM DÚVIDAS ('Não', 'Não tenho dúvidas', 'Nenhuma', 'Sem dúvidas', etc.):\n"
            "   - Acolha com simpatia (ex: expressando que é ótimo que tudo tenha ficado claro) e dê sequência imediata introduzindo estritamente a próxima etapa pendente do funil de qualificação abaixo. É TERMINANTEMENTE PROIBIDO dar tchau, se despedir ou encerrar o atendimento enquanto houver etapas de qualificação pendentes!\n"
            "3. ❓ O LEAD FEZ UMA DÚVIDA / PERGUNTA TÉCNICA OU DE PREÇO ISOLADA:\n"
            "   - Priorize responder à dúvida do cliente com clareza para gerar confiança, e faça uma ponte natural para a etapa de qualificação pendente.\n"
            "4. 🚫 PROIBIDO USAR FRASES ROBÓTICAS OU ENGESSADAS:\n"
            "   - Não repita textos literais. Leia o 'Objetivo / Prompt de Sondagem' da etapa e formule a pergunta com suas próprias palavras, adaptando ao contexto exato do que foi conversado até agora.\n"
            "5. ⏳ UMA ETAPA POR VEZ & CUMPRIMENTO ESTRITO DO OBJETIVO DE SONDAGEM:\n"
            "   - Trabalhe um objetivo de cada vez. Só avance para o próximo quando o lead tiver respondido ao objetivo da etapa atual.\n"
            "   - ⚠️ O cumprimento de cada etapa depende ESTRITAMENTE do seu 'Objetivo / Prompt de Sondagem', e NÃO apenas do título da etapa!\n"
            "   - Se a etapa possui uma diretriz de sondagem interna (ex: investigar renda, atuação, faturamento, aparelho, orçamento, dor ou experiência), você NUNCA deve avançar para a próxima etapa até que as informações solicitadas na diretriz tenham sido efetivamente investigadas e respondidas pelo lead, mesmo que o lead já tenha mencionado voluntariamente dados superficiais como o nome.\n"
            "6. 🚫 PROIBIDO ANTECIPAR O FECHAMENTO OU MENCIONAR LINKS/OFERTAS NAS ETAPAS INTERMEDIÁRIAS:\n"
            "   - Enquanto houver etapas pendentes de qualificação no funil, você está TERMINANTEMENTE PROIBIDO de:\n"
            "     * Antecipar o fechamento ou formular a pergunta final;\n"
            "     * Mencionar links de pagamento, páginas de checkout, matrículas ou oferta do curso;\n"
            "     * Perguntar se pode enviar o link antes de todas as etapas serem 100% concluídas.\n"
            "   - Durante as etapas do funil, concentre-se ÚNICA E EXCLUSIVAMENTE em acolher o cliente, responder eventuais dúvidas dele (via RAG) e fazer a pergunta investigativa da etapa pendente.\n"
            "7. 🏁 FINALIZAÇÃO & ACIONAMENTO ÚNICO DA FERRAMENTA `lead_qualificado` (OBRIGATÓRIO):\n"
            "   - ⚠️ REGRA DE OURO (ACIONAMENTO ÚNICO): A ferramenta `lead_qualificado` DEVE SER ACIONADA EXATAMENTE UMA ÚNICA VEZ durante todo o atendimento ao lead. É ESTRITAMENTE PROIBIDO chamá-la em etapas intermediárias ou quando faltarem perguntas a serem respondidas!\n"
            "   - No mesmo turno em que o lead responder à última etapa pendente do funil (ex: forneceu e-mail ou último dado que faltava), você DEVE OBRIGATORIAMENTE emitir a chamada da ferramenta `lead_qualificado` (tool call) passando em `respostas` todos os dados coletados.\n"
            "   - 🚫 SIGILO ABSOLUTO DO PROCESSO DE QUALIFICAÇÃO (TERMOS PROIBIDOS): O processo de qualificação de lead é 100% interno, técnico e invisível para o cliente. É TERMINANTEMENTE PROIBIDO dizer ao cliente frases como 'você está qualificado para prosseguir', 'sua qualificação foi aprovada', 'com os dados que forneceu você se qualificou' ou mencionar palavras como 'qualificação', 'etapas' ou 'etiquetas'. Comunique-se sempre de forma humana e amigável: apenas agradeça o dado recebido (ex: 'Muito obrigado pelas informações, [Nome]!') e formule a pergunta final de fechamento.\n"
            "   - ⚠️ NA RESPOSTA FINAL: Acolha e agradeça pelos dados enviados, responda a eventuais dúvidas com a base de conhecimento e conclua com a Pergunta/Ação Final de Fechamento abaixo (proibido respostas genéricas/secas).\n"
        )

        final_action = active_funnel.get("final_action")
        trigger = active_funnel.get("final_action_trigger", "all") or "all"
        trigger_str = str(trigger).strip().lower()

        trigger_cond_text = "Assim que TODAS as etapas de qualificação forem respondidas pelo lead (e a ferramenta `lead_qualificado` for acionada)"
        if trigger_str in ('hot', 'quente'):
            trigger_cond_text += " E o lead for classificado como Quente 🔥"
        elif trigger_str in ('hot_warm'):
            trigger_cond_text += " E o lead for classificado como Quente 🔥 ou Morno ⚡"
        elif trigger_str in ('warm', 'morno'):
            trigger_cond_text += " E o lead for classificado como Morno ⚡"
        elif trigger_str in ('cold', 'frio'):
            trigger_cond_text += " E o lead for classificado como Frio ❄️"

        if final_action and final_action.strip():
            prompt_part += (
                f"\n8. 🎯 **AÇÃO / PERGUNTA FINAL DE FECHAMENTO PÓS-QUALIFICAÇÃO (SOMENTE APÓS TODAS AS ETAPAS CONCLUÍDAS):**\n"
                f"   - ⚠️ ATENÇÃO MÁXIMA: ESTA SEÇÃO SÓ PODE SER ACIONADA NO TURNO EM QUE A FERRAMENTA `lead_qualificado` FOR CHAMADA! É TERMINANTEMENTE PROIBIDO USAR ESTA DIRETRIZ OU MENCIONAR LINKS NAS ETAPAS 1, 2, ETC.!\n"
                f"   - {trigger_cond_text}, você DEVE OBRIGATORIAMENTE formular a pergunta ou ação final de fechamento baseada na diretriz abaixo:\n"
                f"   ↳ DIRETRIZ DE FECHAMENTO / CTA: \"{final_action.strip()}\"\n"
                f"   - 🚨 PRIORIDADE ABSOLUTA DE FECHAMENTO: Esta pergunta final de fechamento SUBSTITUI E TEM PRIORIDADE MÁXIMA sobre qualquer outra pergunta genérica (como 'Posso ajudar com mais alguma dúvida?' de <Primeira_Resposta> ou regras que dizem para não perguntar no final). Quando o lead conclui a qualificação, você NUNCA encerra com perguntas genéricas de dúvidas; você DEVE encerrar com a pergunta da diretriz de fechamento!\n"
                f"   - Conduza essa pergunta final de forma natural, calorosa e consultiva para converter o atendimento (ex: perguntando se pode enviar o link do curso, convidando para matrícula ou agendamento).\n"
                f"   - ⚠️ REGRA DE PERMISSÃO EM DOIS PASSOS (PROIBIDO ENVIAR O LINK ANTES DO 'SIM'):\n"
                f"     * Se a diretriz pedir para perguntar se pode enviar o link ou verificar interesse (ex: 'pergunte se eu posso enviar o link...'): NESTA RESPOSTA você deve APENAS FAZER A PERGUNTA ao lead! É EXPRESSAMENTE PROIBIDO já enviar o link/URL ou checkout junto nesta mensagem!\n"
                f"     * Aguarde o lead responder confirmando (ex: 'sim', 'pode enviar', 'quero'). O envio do link só deve ocorrer no PRÓXIMO turno, após a confirmação explícita do lead.\n"
            )

        return prompt_part
    except Exception as e:
        logger.error(f"Erro ao construir prompt de qualificação: {e}")
        return ""

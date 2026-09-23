export const buildTimelineSteps = (debug, onOpenPreRouterDecision, onOpenPreRouterPrompt) => {
    if (!debug) return [];
    const steps = [];

    // 1. Entrada via WhatsApp / Webhook
    const userMsg = debug.pre_router?.mensagem_original || debug.user_message || "Mensagem do usuário";
    steps.push({
        icon: '📩',
        title: 'Entrada via WhatsApp / Webhook',
        desc: `Mensagem recebida: "${userMsg}"`,
        isWebhook: true
    });

    // 2. Classificador Pre-Router
    if (debug.pre_router) {
        const pr = debug.pre_router;
        const tipoMsg = pr.tipo_mensagem || (pr.eh_saudacao ? 'Saudação' : pr.eh_agradecimento ? 'Agradecimento' : 'Classificação de Intenção');
        const isShortcut = pr._model_used === 'shortcut-logic' || Boolean(pr.resposta_direta) || Boolean(pr.tipo_mensagem?.includes('Atalho')) || Boolean(pr.eh_saudacao) || Boolean(pr.eh_agradecimento);
        const ragStatus = pr.precisa_rag === true
            ? 'Necessário'
            : isShortcut
                ? 'Dispensado (Atalho)'
                : pr.precisa_rag === false
                    ? 'Dispensado / Otimizado'
                    : 'Não Consultado';
        const toolStatus = pr.precisa_ferramenta ? (pr.chamada_ferramenta?.nome || 'Ativa') : 'Nenhuma';

        steps.push({
            icon: '🧠',
            title: 'Classificador Inicial (Pre-Router)',
            isPreRouter: true,
            preRouterData: pr,
            tipoMsg,
            ragStatus,
            toolStatus,
            isShortcut,
            hasDecisionBtn: !!onOpenPreRouterDecision,
            hasPromptBtn: !!pr._debug_prompt && !!onOpenPreRouterPrompt
        });
    }

    // 3. Melhoria / Enriquecimento de Mensagem (Pre-Router)
    if (debug.pre_router) {
        const pr = debug.pre_router;
        const origMsg = pr.mensagem_original || userMsg;
        const improvedMsg = pr.mensagem_melhorada || pr.perguntas_extraidas;
        
        if (improvedMsg && origMsg && improvedMsg.trim() !== origMsg.trim()) {
            steps.push({
                icon: '✍️',
                title: 'Melhoria de Mensagem (Pre-Router)',
                desc: 'Mensagem enriquecida/reescrita com base no contexto para melhor compreensão da IA.',
                isImprovedMsg: true,
                origMsg,
                improvedMsg
            });
        }
    }

    // 3.5 Consulta ao Cache Semântico de Respostas Aprovadas
    const sc = debug.semantic_cache;
    if (sc || debug.cache_hit || debug.from_semantic_cache) {
        const isHitDirect = sc?.status === 'hit_direct' || debug.from_semantic_cache || (debug.cache_hit && !sc?.funnel_active && sc?.status !== 'hit_qualification');
        const isHitQual = sc?.status === 'hit_qualification' || (sc?.funnel_active && debug.cache_hit);
        const isPartial = sc?.status === 'partial_hit';
        const isMiss = sc?.status === 'miss';
        const isDisabled = sc?.status === 'disabled';

        if (isHitDirect) {
            const sim = sc?.similarity_pct || (debug.cached_similarity ? `${(debug.cached_similarity * 100).toFixed(1)}%` : null);
            const query = sc?.matched_query || debug.cached_original_query || 'Pergunta correspondente';
            const matchedQueries = sc?.matched_queries || debug.matched_queries || [];
            steps.push({
                icon: '⚡',
                title: 'Cache Semântico: Resposta Homologada (Custo Zero)',
                desc: `Hit ${sim ? `(${sim})` : ''}: "${query}". Resposta entregue instantaneamente com 0 tokens de LLM.`,
                isSemanticCache: true,
                cacheStatus: 'hit_direct',
                badgeLabel: '⚡ Custo Zero',
                simLabel: sim,
                matchedQueries: matchedQueries.length > 0 ? matchedQueries : [query]
            });
        } else if (isHitQual) {
            const sim = sc?.similarity_pct || (debug.cached_similarity ? `${(debug.cached_similarity * 100).toFixed(1)}%` : null);
            const query = sc?.matched_query || debug.cached_original_query || 'Pergunta correspondente';
            const matchedQueries = sc?.matched_queries || debug.matched_queries || [];
            steps.push({
                icon: '⚡',
                title: 'Cache Semântico + Funil de Qualificação Ativo',
                desc: `Hit ${sim ? `(${sim})` : ''}: "${query}". Resposta oficial homologada no cache injetada com fidelidade no prompt e IA acionada para avançar no funil de perguntas.`,
                isSemanticCache: true,
                cacheStatus: 'hit_qualification',
                badgeLabel: '⚡ Cache + Funil Ativo',
                simLabel: sim,
                matchedQueries: matchedQueries.length > 0 ? matchedQueries : [query]
            });
        } else if (isPartial) {
            const matchedQueries = sc?.matched_queries || debug.matched_queries || [];
            steps.push({
                icon: '⚡',
                title: 'Cache Semântico Parcial (Multi-Perguntas)',
                desc: sc.message || 'Respostas oficiais injetadas para tópicos resolvidos e IA acionada para responder à dúvida complementar.',
                isSemanticCache: true,
                cacheStatus: 'partial_hit',
                badgeLabel: '⚡ Hit Parcial',
                matchedQueries: matchedQueries
            });
        } else if (isMiss) {
            const closest = sc?.closest_candidate ? ` Maior similaridade: ${sc.closest_similarity_pct} ("${sc.closest_candidate}").` : '';
            steps.push({
                icon: '⚡',
                title: 'Cache Semântico Consultado (Sem Match)',
                desc: `Limiar: ${sc?.threshold_pct || '85%'}.${closest} Encaminhado para a Base de Conhecimento e IA.`,
                isSemanticCache: true,
                cacheStatus: 'miss',
                badgeLabel: 'Sem Match',
                simLabel: sc?.closest_similarity_pct
            });
        } else if (isDisabled) {
            steps.push({
                icon: '⚡',
                title: 'Cache Semântico Desativado',
                desc: 'O cache semântico está desligado nas configurações deste agente.',
                isSemanticCache: true,
                cacheStatus: 'disabled',
                badgeLabel: 'Desativado'
            });
        }
    }

    // 4. Variáveis de Contexto
    if (debug.context_variables && Object.keys(debug.context_variables).length > 0) {
        const vars = debug.context_variables;
        const desc = Object.entries(vars).map(([k, v]) => `${k} = ${v}`).join(' · ');
        steps.push({ icon: '📦', title: 'Variáveis de Contexto recebidas', desc, isContextVars: true, vars });
    }

    // 5. Cost Router (se houver)
    if (debug.router_model || debug.model_used) {
        steps.push({
            icon: '⚡',
            title: 'Cost Router (Seleção de Modelo)',
            desc: `Modelo selecionado: ${debug.router_model || debug.model_used}`
        });
    }

    const isGlobalShortcut = debug.pre_router?._model_used === 'shortcut-logic' || Boolean(debug.pre_router?.resposta_direta) || Boolean(debug.pre_router?.tipo_mensagem?.includes('Atalho')) || Boolean(debug.pre_router?.eh_saudacao) || Boolean(debug.pre_router?.eh_agradecimento);

    // 6. RAG / Base de Conhecimento
    const ragQueriesList = debug.rag_queries || (debug.rag_query ? [debug.rag_query] : (debug.pre_router?.lista_perguntas_extraidas || (debug.pre_router?.perguntas_extraidas ? [debug.pre_router.perguntas_extraidas] : [])));
    const ragQueryDisplay = ragQueriesList.length > 0 ? ragQueriesList.join(' | ') : null;

    if (debug.rag_items && debug.rag_items.length > 0) {
        steps.push({
            icon: '📚',
            title: 'RAG Recuperou Contexto',
            desc: `${debug.rag_items.length} fonte(s) da Base de Conhecimento consultada(s)${ragQueryDisplay ? ` • Consulta: "${ragQueryDisplay}"` : ''}`,
            ragQueries: ragQueriesList
        });
    } else if (debug.pre_router?.precisa_rag === false || isGlobalShortcut) {
        steps.push({
            icon: '⚡',
            title: isGlobalShortcut ? 'RAG Dispensado (Atalho Programático)' : 'RAG Otimizado pelo Pre-Router',
            desc: isGlobalShortcut
                ? 'Busca na Base de Conhecimento dispensada por se tratar de um atalho direto com 0 tokens.'
                : 'Busca dispensada pelo Pre-Router para maximizar velocidade'
        });
    } else if (debug.rag_skipped) {
        steps.push({
            icon: '⚡',
            title: 'RAG Otimizado',
            desc: debug.rag_skip_reason || 'Pulado por simplicidade'
        });
    } else if (debug.rag_items && debug.rag_items.length === 0) {
        steps.push({
            icon: '🔍',
            title: 'RAG Consultou',
            desc: `Nenhum resultado relevante encontrado${ragQueryDisplay ? ` • Consulta: "${ragQueryDisplay}"` : ''}`,
            ragQueries: ragQueriesList
        });
    }

    // 7. Pesquisa Web
    if (debug.internet_searched) {
        steps.push({ icon: '🌐', title: 'Pesquisa Web Realizada', desc: `Busca: "${debug.searched_query}"` });
    }

    // 8. Ferramentas (Tools)
    if (debug.tool_calls && debug.tool_calls.length > 0) {
        debug.tool_calls.forEach(tc => {
            steps.push({
                icon: '🛠️',
                title: `Ferramenta Executada: ${tc.name}`,
                desc: `Executada com sucesso. Resultado: ${tc.output?.substring(0, 100)}...`
            });
        });
    }

    // 9. Processamento LLM Principal
    if (isGlobalShortcut) {
        steps.push({
            icon: '⚡',
            title: 'Atalho Direto (Zero LLM)',
            desc: 'Resposta gerada programaticamente pelo Pre-Router com 0 tokens e custo R$ 0,00.'
        });
    } else {
        steps.push({ icon: '🧠', title: 'LLM Processou', desc: `${debug.full_prompt?.length || 0} mensagens totais no prompt` });
    }

    // 10. Guardrails / Filtros
    if (debug.guardrails_active) {
        steps.push({
            icon: '🛡️',
            title: 'Políticas Ativas',
            desc: 'Instruções de segurança aplicadas ao prompt.'
        });
    }

    if (debug.violations) {
        steps.push({
            icon: '🚫',
            title: 'Filtro de Output',
            desc: 'Conteúdo bloqueado foi detectado e censurado.',
            isViolation: true
        });
    }

    // 11. Resposta Gerada e Transmitida (WhatsApp)
    steps.push({ icon: '🤖', title: 'Resposta Gerada & Transmitida (WhatsApp)', time: '00:02' });

    return steps;
};

export default buildTimelineSteps;

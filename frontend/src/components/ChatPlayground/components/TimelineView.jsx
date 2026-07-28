import React from 'react';

const TimelineView = ({ debug, onOpenPreRouterDecision, onOpenPreRouterPrompt }) => {
    if (!debug) return null;
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
        const ragStatus = pr.precisa_rag === true ? 'Necessário' : pr.precisa_rag === false ? 'Dispensado / Otimizado' : 'Automático';
        const toolStatus = pr.precisa_ferramenta ? (pr.chamada_ferramenta?.nome || 'Ativa') : 'Nenhuma';

        steps.push({
            icon: '🧠',
            title: 'Classificador Inicial (Pre-Router)',
            isPreRouter: true,
            preRouterData: pr,
            tipoMsg,
            ragStatus,
            toolStatus,
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

    // 6. RAG / Base de Conhecimento
    if (debug.rag_items && debug.rag_items.length > 0) {
        steps.push({
            icon: '📚',
            title: 'RAG Recuperou Contexto',
            desc: `${debug.rag_items.length} fonte(s) da Base de Conhecimento consultada(s)`
        });
    } else if (debug.pre_router?.precisa_rag === false) {
        steps.push({
            icon: '⚡',
            title: 'RAG Otimizado pelo Pre-Router',
            desc: 'Busca dispensada pelo Pre-Router para maximizar velocidade'
        });
    } else if (debug.rag_skipped) {
        steps.push({
            icon: '⚡',
            title: 'RAG Otimizado',
            desc: debug.rag_skip_reason || 'Pulado por simplicidade'
        });
    } else if (debug.rag_items && debug.rag_items.length === 0) {
        steps.push({ icon: '🔍', title: 'RAG Consultou', desc: 'Nenhum resultado relevante encontrado' });
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
    steps.push({ icon: '🧠', title: 'LLM Processou', desc: `${debug.full_prompt?.length || 0} mensagens totais no prompt` });

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

    return (
        <div className="timeline-container">
            {steps.map((step, i) => (
                <div key={i} className={`timeline-step ${step.isViolation ? 'violation' : ''}`}>
                    <div className="step-icon">{step.icon}</div>
                    <div className="step-content">
                        <div className="step-title" style={{ color: step.isViolation ? '#f43f5e' : step.isContextVars ? '#f59e0b' : step.isPreRouter ? '#fbbf24' : step.isWebhook ? '#60a5fa' : '' }}>
                            {step.title}
                        </div>

                        {step.isPreRouter ? (
                            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                    <span style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                        🏷️ {step.tipoMsg}
                                    </span>
                                    <span style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px' }}>
                                        📚 RAG: {step.ragStatus}
                                    </span>
                                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '2px 8px', borderRadius: '12px' }}>
                                        🛠️ Ferramentas: {step.toolStatus}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                    {step.hasDecisionBtn && (
                                        <button
                                            onClick={onOpenPreRouterDecision}
                                            style={{
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                                color: '#fbbf24',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                transition: 'all 0.2s'
                                            }}
                                            className="playground-action-btn"
                                        >
                                            🧠 Ver Decisão do Pre-Router
                                        </button>
                                    )}
                                    {step.hasPromptBtn && (
                                        <button
                                            onClick={onOpenPreRouterPrompt}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                color: '#e2e8f0',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            className="playground-action-btn"
                                        >
                                            📄 Ver Prompt do Pre-Router
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : step.isImprovedMsg ? (
                            <div style={{ marginTop: '6px', fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px' }}>
                                <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
                                    <strong style={{ color: '#cbd5e1' }}>Mensagem Original:</strong> "{step.origMsg}"
                                </div>
                                <div style={{ color: '#4ade80' }}>
                                    <strong style={{ color: '#86efac' }}>Mensagem Melhorada / Enriquecida:</strong> "{step.improvedMsg}"
                                </div>
                            </div>
                        ) : step.isContextVars && step.vars ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {Object.entries(step.vars).map(([k, v]) => (
                                    <span key={k} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                                        borderRadius: '12px', padding: '2px 8px', fontSize: '0.72rem',
                                        fontFamily: 'monospace', color: '#fbbf24'
                                    }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{k}</span>
                                        <span style={{ opacity: 0.5 }}>=</span>
                                        <span>{String(v)}</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            step.desc && <div className="step-desc" style={{ color: step.isViolation ? '#fda4af' : '' }}>
                                {step.desc}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TimelineView;

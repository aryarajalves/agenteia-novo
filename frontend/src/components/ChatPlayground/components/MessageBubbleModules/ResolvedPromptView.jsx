import React from 'react';
import { estimateTokens, formatTokenCount } from '../../utils/tokenUtils';

const extractStaticPrompt = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const cleanLines = [];
    for (const line of lines) {
        if (line.includes('### DIRETRIZES DE SEGURANÇA E ESTILO') || 
            line.includes('# CONTEXTO RAG:') || 
            line.includes('# RESUMO DAS MEMÓRIAS')) {
            break;
        }
        cleanLines.push(line);
    }
    return cleanLines.join('\n').trim();
};

const extractDynamicBlocks = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const qualifLines = [];
    let isQualif = false;
    for (const line of lines) {
        if (line.includes('🎯 **QUALIFICAÇÃO DE LEAD')) {
            isQualif = true;
        }
        if (isQualif) {
            if (line.includes('### DIRETRIZES DE SEGURANÇA')) {
                break;
            }
            qualifLines.push(line);
        }
    }
    return qualifLines.join('\n').trim();
};

const extractInjectedPrompt = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const injectedLines = [];
    let isInjected = false;
    for (const line of lines) {
        if (line.includes('### DIRETRIZES DE SEGURANÇA') || line.includes('# CONTEXTO RAG:')) {
            isInjected = true;
        }
        if (isInjected) {
            injectedLines.push(line);
        }
    }
    return injectedLines.join('\n').trim();
};

const TokenBadge = ({ text, color = '#34d399', bg = 'rgba(16, 185, 129, 0.15)', border = 'rgba(16, 185, 129, 0.3)' }) => {
    const tokens = estimateTokens(text);
    const chars = (text || '').length;
    return (
        <span style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            padding: '3px 10px',
            borderRadius: '12px',
            background: bg,
            border: `1px solid ${border}`,
            color: color,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap'
        }}>
            ⚡ ~{formatTokenCount(tokens)} tokens · {chars.toLocaleString('pt-BR')} caracteres
        </span>
    );
};

const ResolvedPromptView = ({ activeResolvedPromptTab, activeModal }) => {
    const fullContent = activeModal.content || '';
    const staticText = extractStaticPrompt(fullContent);
    const dynamicText = extractDynamicBlocks(fullContent);
    const injectedText = extractInjectedPrompt(fullContent);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e2e8f0', textAlign: 'left' }}>
            {activeResolvedPromptTab === 'static' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: '#34d399', fontSize: '1rem', fontWeight: '700' }}>
                            Prompt Estático (Instruções e Identidade)
                        </h4>
                        <TokenBadge text={staticText} color="#34d399" bg="rgba(16, 185, 129, 0.15)" border="rgba(16, 185, 129, 0.3)" />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Instruções permanentes e identidade base do assistente configuradas no painel.
                    </p>
                    <pre style={{ 
                        fontSize: '0.85rem', 
                        background: 'rgba(7, 10, 19, 0.2)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        fontFamily: "monospace", 
                        color: '#cbd5e1',
                        margin: 0
                    }}>
                        {staticText || "(Prompt base não configurado)"}
                    </pre>
                </div>
            )}

            {activeResolvedPromptTab === 'dynamic' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: '#34d399', fontSize: '1rem', fontWeight: '700' }}>
                            Blocos Dinâmicos e Qualificação
                        </h4>
                        {dynamicText && <TokenBadge text={dynamicText} color="#38bdf8" bg="rgba(56, 189, 248, 0.15)" border="rgba(56, 189, 248, 0.3)" />}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Protocolos de qualificação de leads dinâmicos ativos para esta sessão.
                    </p>
                    <pre style={{ 
                        fontSize: '0.85rem', 
                        background: 'rgba(7, 10, 19, 0.2)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        fontFamily: "monospace", 
                        color: '#cbd5e1',
                        margin: 0
                    }}>
                        {dynamicText || "Nenhum bloco de qualificação dinâmico ou condicional foi ativado para esta resposta."}
                    </pre>
                </div>
            )}

            {activeResolvedPromptTab === 'injected' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: '#34d399', fontSize: '1rem', fontWeight: '700' }}>
                            Injetado Automaticamente pelo Código
                        </h4>
                        {injectedText && <TokenBadge text={injectedText} color="#a78bfa" bg="rgba(167, 139, 250, 0.15)" border="rgba(167, 139, 250, 0.3)" />}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Conteúdos de segurança e regras injetados nos bastidores (Blacklist de concorrentes, Políticas de Desconto, jargões, RAG e histórico).
                    </p>
                    <pre style={{ 
                        fontSize: '0.85rem', 
                        background: 'rgba(7, 10, 19, 0.2)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        fontFamily: "monospace", 
                        color: '#cbd5e1',
                        margin: 0
                    }}>
                        {injectedText || "Nenhuma regra de segurança ou RAG externa foi injetada nesta resposta."}
                    </pre>
                </div>
            )}

            {activeResolvedPromptTab === 'variables' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '1rem', fontWeight: '700' }}>Variáveis Ativas no Contexto</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Valores das variáveis de contexto (incluindo temporais, memórias e integrações) injetadas para esta resposta específica.
                    </p>
                    {activeModal.rawData?.context_variables && Object.keys(activeModal.rawData.context_variables).length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                            {Object.entries(activeModal.rawData.context_variables).map(([key, val]) => (
                                <div key={key} style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>{key}</span>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        color: '#6366f1',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        padding: '4px 10px',
                                        borderRadius: '6px'
                                    }}>
                                        {val === null || val === undefined ? 'null' : String(val)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                            Nenhuma variável ativa ou injetada no contexto para esta resposta.
                        </p>
                    )}
                </div>
            )}

            {activeResolvedPromptTab === 'full' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
                            Texto completo consolidado (Prompt Base + Dinâmicos + Regras + RAG):
                        </span>
                        <TokenBadge text={fullContent} color="#34d399" bg="rgba(16, 185, 129, 0.15)" border="rgba(16, 185, 129, 0.3)" />
                    </div>
                    <pre style={{ 
                        fontSize: '0.85rem', 
                        background: 'rgba(7, 10, 19, 0.4)', 
                        padding: '24px', 
                        borderRadius: '16px', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        fontFamily: "'Fira Code', 'Courier New', Courier, monospace", 
                        color: '#cbd5e1', 
                        margin: 0, 
                        textAlign: 'left', 
                        lineHeight: '1.6', 
                        overflowX: 'auto' 
                    }}>
                        {fullContent}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default ResolvedPromptView;

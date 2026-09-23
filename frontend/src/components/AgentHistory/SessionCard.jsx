import React from 'react';

export const SessionCard = ({
    session,
    isExpanded,
    onToggleExpand,
    isSelected,
    onToggleSelect,
    summary,
    isLoadingSummary,
    onSummarize
}) => {
    return (
        <div className="session-card" style={{
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
        }}>
            {/* Cabeçalho da Sessão */}
            <div
                onClick={onToggleExpand}
                style={{
                    padding: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={onToggleSelect}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', zIndex: 10 }}
                        />
                        <span style={{ fontSize: '1rem' }}>💬 {session.id.slice(0, 8)}...</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                            {session.interactions.length} {session.interactions.length === 1 ? 'msg' : 'msgs'}
                        </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Início: {session.startTime ? new Date(session.startTime + 'Z').toLocaleString('pt-BR') : '—'}
                    </span>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--success-color)', fontWeight: 700, fontSize: '0.9rem' }}>R$ {(session.totalCost || 0).toFixed(2)}</span>
                        <span>{session.totalTokens} tokens</span>
                    </div>
                    <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', opacity: 0.5 }}>
                        🔽
                    </span>
                </div>
            </div>

            {/* Conteúdo da Sessão (Mensagens) */}
            {isExpanded && (
                <div className="session-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                    {/* Inverter interações para mostrar a ordem cronológica correta (mais antiga primeiro dentro da sessão) */}
                    {[...session.interactions].reverse().map((log, idx) => (
                        <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.3, fontSize: '0.65rem' }}>
                                {idx + 1}ª Interação • {new Date(log.timestamp + 'Z').toLocaleTimeString('pt-BR')}
                            </div>

                            {/* Mensagem do Usuário */}
                            <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>VOCÊ</span>
                                </div>
                                <div style={{ background: 'var(--accent-color)', color: 'white', padding: '0.8rem 1.2rem', borderRadius: '18px 18px 4px 18px', fontSize: '0.9rem' }}>
                                    {log.user_message}
                                </div>
                            </div>

                            {/* Mensagem do Agente */}
                            <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>IA ({log.model_used})</span>
                                </div>
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.9)',
                                    padding: '1rem',
                                    borderRadius: '18px 18px 18px 4px',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {log.agent_response}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                    <span>📦 {log.input_tokens + log.output_tokens} tok</span>
                                    <span>💰 R$ {(log.cost_brl || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Botão e Caixa de Resumo */}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                        {!summary ? (
                            <button
                                onClick={onSummarize}
                                disabled={isLoadingSummary}
                                style={{
                                    background: 'rgba(255, 191, 0, 0.1)',
                                    border: '1px solid rgba(255, 191, 0, 0.3)',
                                    color: '#fbbf24',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isLoadingSummary ? '⏳ Gerando...' : '📝 Resumir Conversa'}
                            </button>
                        ) : (
                            <div style={{
                                background: 'rgba(251, 191, 36, 0.08)',
                                borderLeft: '4px solid #fbbf24',
                                padding: '1.2rem',
                                borderRadius: '4px 12px 12px 4px',
                                fontSize: '0.9rem',
                                color: '#fef3c7',
                                lineHeight: '1.5',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <span>📄 Resumo da IA</span>
                                    </div>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        background: summary.is_cached ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                        color: summary.is_cached ? '#818cf8' : '#10b981',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid currentColor'
                                    }}>
                                        {summary.is_cached ? '📦 RECUPERADO DO BANCO' : '✨ GERADO AGORA'}
                                    </span>
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                                    {summary.summary}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: '15px',
                                    fontSize: '0.7rem',
                                    color: '#fbbf24',
                                    opacity: 0.8,
                                    borderTop: '1px solid rgba(251, 191, 36, 0.15)',
                                    paddingTop: '8px'
                                }}>
                                    <span>📊 Tokens: <strong>{summary.usage?.total_tokens || 0}</strong></span>
                                    <span>💰 Custo: <strong>R$ {(summary.cost_brl || 0).toFixed(2)}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionCard;


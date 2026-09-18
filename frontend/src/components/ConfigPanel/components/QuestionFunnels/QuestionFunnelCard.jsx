import React from 'react';

const QuestionFunnelCard = ({
    funnel,
    onToggleActive,
    onEdit,
    onDelete,
    onTest
}) => {
    const steps = funnel.steps || [];
    const variations = funnel.trigger_variations || [];
    const thresholdPct = Math.round((funnel.similarity_threshold || 0.82) * 100);
    const isOncePerLead = (funnel.frequency_mode || 'once_per_lead') === 'once_per_lead';

    return (
        <div 
            className="p-5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all shadow-lg"
            style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: funnel.is_active ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(100, 116, 139, 0.2)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1rem',
                backdropFilter: 'blur(10px)',
                position: 'relative'
            }}
        >
            {/* Top Row: Title, Badges, Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>🎯</span>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                            {funnel.name}
                        </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            fontWeight: 600
                        }}>
                            🎯 Sensibilidade: {thresholdPct}%
                        </span>

                        <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: isOncePerLead ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            border: isOncePerLead ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                            color: isOncePerLead ? '#c084fc' : '#4ade80',
                            fontWeight: 600
                        }}>
                            {isOncePerLead ? '👤 1x por lead (Recomendado)' : '♾️ Sempre que perguntar'}
                        </span>

                        {funnel.total_executions > 0 && (
                            <span style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                background: 'rgba(234, 179, 8, 0.15)',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                color: '#facc15',
                                fontWeight: 600
                            }}>
                                🚀 {funnel.total_executions} {funnel.total_executions === 1 ? 'disparo' : 'disparos'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Switch Ativo / Inativo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', color: funnel.is_active ? '#4ade80' : '#94a3b8', fontWeight: 600 }}>
                        {funnel.is_active ? 'Ativo' : 'Pausado'}
                    </span>
                    <button
                        type="button"
                        onClick={() => onToggleActive(funnel)}
                        style={{
                            width: '42px',
                            height: '24px',
                            borderRadius: '9999px',
                            background: funnel.is_active ? '#22c55e' : '#475569',
                            border: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            padding: '2px'
                        }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            transform: funnel.is_active ? 'translateX(18px)' : 'translateX(0)',
                            transition: 'transform 0.2s'
                        }} />
                    </button>
                </div>
            </div>

            {/* Trigger Question Box */}
            <div style={{
                marginTop: '0.85rem',
                padding: '0.75rem 0.9rem',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px'
            }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
                    💬 Pergunta Gatilho:
                </div>
                <div style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>
                    "{funnel.trigger_question}"
                </div>

                {variations.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Variações reconhecidas:</span>
                        {variations.slice(0, 3).map((v, i) => (
                            <span key={i} style={{
                                fontSize: '0.72rem',
                                padding: '0.1rem 0.45rem',
                                background: 'rgba(51, 65, 85, 0.6)',
                                borderRadius: '6px',
                                color: '#cbd5e1'
                            }}>
                                "{v}"
                            </span>
                        ))}
                        {variations.length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                +{variations.length - 3} mais
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Steps Preview */}
            <div style={{ marginTop: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
                    📋 Sequência de Passos ({steps.length}):
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {steps.map((st, idx) => {
                        const isAudio = st.type === 'audio';
                        const icon = isAudio ? '🎙️' : st.type === 'image' ? '🖼️' : st.type === 'video' ? '🎥' : '💬';
                        const label = isAudio ? 'Áudio PTT' : st.type === 'text' ? 'Texto' : st.type;
                        const delayText = st.delay_seconds > 0 ? ` (+${st.delay_seconds}s)` : '';

                        return (
                            <div 
                                key={idx} 
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.35rem 0.6rem',
                                    background: isAudio ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                    border: isAudio ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    color: isAudio ? '#34d399' : '#93c5fd',
                                    fontWeight: 600
                                }}
                            >
                                <span>{idx + 1}. {icon} {label}{delayText}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions Bar */}
            <div style={{
                marginTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem'
            }}>
                <button
                    type="button"
                    onClick={() => onTest(funnel)}
                    style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                    }}
                >
                    🧪 Testar Gatilho
                </button>

                <button
                    type="button"
                    onClick={() => onEdit(funnel)}
                    style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                    }}
                >
                    ✏️ Editar
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(funnel)}
                    style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#f87171',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                    }}
                >
                    🗑️ Excluir
                </button>
            </div>
        </div>
    );
};

export default QuestionFunnelCard;

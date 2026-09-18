import React, { useState } from 'react';
import ExpandedFieldModal from '../../GlobalContextManager/components/ExpandedFieldModal';

const TRIGGER_OPTIONS = [
    {
        id: 'all',
        label: 'Sempre',
        badge: '🌟 Todas',
        desc: 'Envia para qualquer lead que conclua as etapas de qualificação, independentemente da temperatura.'
    },
    {
        id: 'hot',
        label: 'Apenas Quente',
        badge: '🔥 Quente',
        desc: 'Envia somente se o lead for classificado como Quente 🔥. Mornos e Frios receberão uma despedida cordial sem oferta de fechamento.'
    },
    {
        id: 'hot_warm',
        label: 'Quente ou Morno',
        badge: '🔥⚡ Quente/Morno',
        desc: 'Envia se o lead for classificado como Quente 🔥 ou Morno ⚡. Frios receberão apenas encerramento cordial.'
    },
    {
        id: 'warm',
        label: 'Apenas Morno',
        badge: '⚡ Morno',
        desc: 'Envia somente se o lead for classificado como Morno ⚡.'
    },
    {
        id: 'cold',
        label: 'Apenas Frio',
        badge: '❄️ Frio',
        desc: 'Envia somente se o lead for classificado como Frio ❄️ (ex: pesquisa ou reativação).'
    }
];

const QualificationFinalActionSection = ({ 
    value = '', 
    onChange, 
    triggerValue = 'all', 
    onTriggerChange 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const suggestions = [
        "Pergunte se eu posso enviar o link do curso para ele.",
        "Pergunte se ele gostaria de receber o link de matrícula com a condição especial.",
        "Pergunte se ele tem alguma dúvida antes de enviarmos o link de inscrição.",
        "Convide o lead para agendar uma demonstração prática ou falar com um especialista."
    ];

    const currentTrigger = triggerValue || 'all';
    const activeOption = TRIGGER_OPTIONS.find(opt => opt.id === currentTrigger) || TRIGGER_OPTIONS[0];

    return (
        <div 
            className="form-section" 
            data-testid="qualification-final-action-section"
            style={{ 
                marginTop: '1.5rem', 
                borderTop: '1px solid rgba(255,255,255,0.08)', 
                paddingTop: '1.5rem' 
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                        🎯 Pergunta / Ação Final Pós-Qualificação (Fechamento)
                    </span>
                    <button
                        type="button"
                        className="btn-maximize-field"
                        data-testid="maximize-qualification-final-action-header-btn"
                        onClick={() => setIsExpanded(true)}
                        title="Maximizar editor de texto"
                    >
                        ⛶ Maximizar
                    </button>
                </div>
                <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    background: 'rgba(56, 189, 248, 0.15)', 
                    border: '1px solid rgba(56, 189, 248, 0.3)', 
                    color: '#38bdf8',
                    fontWeight: 600
                }}>
                    ✨ Fechamento do Funil
                </span>
            </div>

            <p className="subtab-tip" style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.4' }}>
                Defina a pergunta ou diretriz que a IA formulará <strong>imediatamente após o lead responder a todas as etapas</strong> de qualificação (ex: pedir permissão para enviar o link do curso, convidar para fechar, etc.).
            </p>

            {/* Condição de Disparo Baseada no Lead Score */}
            <div style={{ 
                marginBottom: '1rem', 
                background: 'rgba(15, 23, 42, 0.5)', 
                border: '1px solid rgba(255, 255, 255, 0.06)', 
                borderRadius: '8px', 
                padding: '12px' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🚦 Quando enviar a pergunta final?
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Filtro condicional por temperatura do lead
                    </span>
                </div>

                <div 
                    data-testid="qualification-final-action-trigger-options"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '8px',
                        marginBottom: '8px'
                    }}
                >
                    {TRIGGER_OPTIONS.map((opt) => {
                        const isSelected = currentTrigger === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                data-testid={`trigger-opt-${opt.id}`}
                                onClick={() => onTriggerChange && onTriggerChange(opt.id)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: isSelected 
                                        ? '1px solid #6366f1' 
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: isSelected 
                                        ? 'rgba(99, 102, 241, 0.2)' 
                                        : 'rgba(255, 255, 255, 0.03)',
                                    color: isSelected ? '#ffffff' : '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.25)' : 'none',
                                    textAlign: 'center'
                                }}
                            >
                                <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? '700' : '500' }}>
                                    {opt.badge}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: isSelected ? '#c7d2fe' : '#64748b', marginTop: '2px' }}>
                                    {opt.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Explicação Dinâmica do Modo Ativo */}
                <div style={{
                    fontSize: '0.75rem',
                    color: '#a5b4fc',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderLeft: '3px solid #6366f1',
                    padding: '6px 10px',
                    borderRadius: '0 6px 6px 0',
                    lineHeight: '1.4'
                }}>
                    💡 {activeOption.desc}
                </div>
            </div>

            {/* Cabeçalho do Campo de Texto com Botão Maximizar */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '8px',
                marginTop: '12px'
            }}>
                <label 
                    htmlFor="qualification-final-action-textarea"
                    style={{ 
                        fontSize: '0.84rem', 
                        fontWeight: 700, 
                        color: '#f8fafc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                    }}
                >
                    ✍️ Diretriz / Pergunta de Fechamento (Pergunta Final):
                </label>
                <button
                    type="button"
                    className="btn-maximize-field"
                    data-testid="maximize-qualification-final-action-btn"
                    onClick={() => setIsExpanded(true)}
                    title="Maximizar editor de texto"
                    style={{
                        background: 'rgba(99, 102, 241, 0.18)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        color: '#c7d2fe',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)'
                    }}
                >
                    ⛶ Maximizar Campo
                </button>
            </div>

            <textarea
                id="qualification-final-action-textarea"
                data-testid="qualification-final-action-input"
                placeholder="Ex: Pergunte pro usuário de forma consultiva e simpática se eu posso enviar o link do curso para ele..."
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                style={{ 
                    minHeight: '85px', 
                    width: '100%', 
                    background: 'rgba(15, 23, 42, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    borderRadius: '8px', 
                    padding: '10px 14px', 
                    color: '#fff', 
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                }}
            />

            {/* Sugestões Rápidas */}
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>💡 Sugestões rápidas:</span>
                {suggestions.map((sug, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onChange(sug)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                            e.currentTarget.style.color = '#c7d2fe';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = '#cbd5e1';
                        }}
                    >
                        {sug}
                    </button>
                ))}
            </div>

            {/* Modal de Edição Centralizado / Tela Cheia */}
            <ExpandedFieldModal
                isOpen={isExpanded}
                title="Pergunta / Ação Final Pós-Qualificação (Fechamento)"
                subtitle="Defina a pergunta ou diretriz que a IA formulará imediatamente após o lead responder a todas as etapas de qualificação (ex: pedir permissão para enviar o link do curso, convidar para fechar, etc.)."
                icon="🎯"
                value={value || ''}
                placeholder="Ex: Pergunte pro usuário de forma consultiva e simpática se eu posso enviar o link do curso para ele..."
                onSave={(newVal) => onChange(newVal)}
                onClose={() => setIsExpanded(false)}
            />
        </div>
    );
};

export default QualificationFinalActionSection;

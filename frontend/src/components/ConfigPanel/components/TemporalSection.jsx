import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import TemporalConfigGuideModal from './Modals/TemporalConfigGuideModal';

const TemporalSection = () => {
    const {
        initialMessage, setInitialMessage,
        initialQuestionMessage, setInitialQuestionMessage,
        greetingMode, setGreetingMode,
        questionMode, setQuestionMode,
        dateAwareness, setDateAwareness,
        dateAwarenessPastDays, setDateAwarenessPastDays,
        dateAwarenessFutureDays, setDateAwarenessFutureDays,
        simulatedTime, setSimulatedTime
    } = useConfig();

    const [showTemporalConfigGuide, setShowTemporalConfigGuide] = useState(false);

    useEffect(() => {
        if (showTemporalConfigGuide) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [showTemporalConfigGuide]);

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <TemporalConfigGuideModal isOpen={showTemporalConfigGuide} onClose={() => setShowTemporalConfigGuide(false)} />

            {/* 1. Modo de Saudação Inicial (Pre-Router) */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>👋</span> Comportamento da Saudação Inicial (1ª Mensagem)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                            Define como o Pre-Router AI responderá quando o usuário enviar apenas uma saudação (&quot;Oi&quot;, &quot;Olá&quot;, &quot;Bom dia&quot;).
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <button
                            type="button"
                            data-testid="btn-greeting-mode-prompt"
                            onClick={() => setGreetingMode('prompt')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: greetingMode === 'prompt' ? '#6366f1' : 'transparent',
                                color: greetingMode === 'prompt' ? '#fff' : '#94a3b8',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            🤖 Prompt do Agente (IA)
                        </button>
                        <button
                            type="button"
                            data-testid="btn-greeting-mode-panel"
                            onClick={() => setGreetingMode('panel')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: greetingMode === 'panel' ? '#6366f1' : 'transparent',
                                color: greetingMode === 'panel' ? '#fff' : '#94a3b8',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            📋 Painel (Texto Fixo)
                        </button>
                    </div>
                </div>

                {greetingMode === 'panel' ? (
                    <div style={{ marginTop: '6px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                            Mensagem de Saudação Fixa do Painel:
                        </label>
                        <input
                            type="text"
                            data-testid="input-initial-message"
                            value={initialMessage || ''}
                            onChange={(e) => setInitialMessage(e.target.value)}
                            placeholder="Ex: Oi, eu sou a Ana, assistente do Vinícius Spinoza..."
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(15, 23, 42, 0.7)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#f8fafc',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ fontSize: '0.78rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        ✨ <strong>Modo Inteligente Ativo:</strong> O Pre-Router AI consulta as instruções de <strong>Saudação Inicial (Regra 10)</strong> e a personalidade/nome configurados no Prompt do Agente para responder dinamicamente.
                    </div>
                )}
            </div>

            {/* 2. Modo de Continuação após Responder a 1ª Dúvida (Quando a 1ª Mensagem já é uma Pergunta) */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🎯</span> Continuação após 1ª Dúvida Respondida (1ª Mensagem)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                            Define a pergunta ou mensagem que o agente enviará logo após responder a primeira dúvida do usuário (quando a 1ª mensagem do contato for uma pergunta).
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <button
                            type="button"
                            data-testid="btn-question-mode-prompt"
                            onClick={() => setQuestionMode('prompt')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: questionMode === 'prompt' ? '#6366f1' : 'transparent',
                                color: questionMode === 'prompt' ? '#fff' : '#94a3b8',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            🤖 Prompt do Agente (IA)
                        </button>
                        <button
                            type="button"
                            data-testid="btn-question-mode-panel"
                            onClick={() => setQuestionMode('panel')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: questionMode === 'panel' ? '#6366f1' : 'transparent',
                                color: questionMode === 'panel' ? '#fff' : '#94a3b8',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            📋 Painel (Texto Fixo)
                        </button>
                    </div>
                </div>

                {questionMode === 'panel' ? (
                    <div style={{ marginTop: '6px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                            Mensagem/Pergunta de Continuação Fixa (Anexada após a 1ª resposta):
                        </label>
                        <input
                            type="text"
                            data-testid="input-initial-question-message"
                            value={initialQuestionMessage || ''}
                            onChange={(e) => setInitialQuestionMessage(e.target.value)}
                            placeholder="Ex: Qual é o seu nome? ou Você já trabalha na área da estética?"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(15, 23, 42, 0.7)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#f8fafc',
                                fontSize: '0.85rem'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sugestões rápidas:</span>
                            {[
                                'Qual é o seu nome?',
                                'Você já trabalha na área ou está começando do zero?',
                                'De qual cidade você está falando?',
                                'Você possui mais alguma dúvida sobre o método?'
                            ].map((sug, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setInitialQuestionMessage(sug)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        color: '#cbd5e1',
                                        fontSize: '0.7rem',
                                        padding: '2px 8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: '0.78rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        ✨ <strong>Modo Inteligente Ativo:</strong> O Agente de IA utiliza as diretrizes do seu <strong>Prompt Principal</strong> e do <strong>Funil de Qualificação</strong> para conduzir a conversa e formular dinamicamente a próxima pergunta de sondagem.
                    </div>
                )}
            </div>

            {/* 3. Consciência Temporal */}
            <div className="temporal-config-box" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="checkbox-group" onClick={() => setDateAwareness(!dateAwareness)} style={{ margin: 0 }}>
                            <input type="checkbox" checked={dateAwareness} readOnly />
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>🕒 Ativar Consciência Temporal</span>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowTemporalConfigGuide(true); }}
                            style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                color: '#818cf8',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                            title="Saiba mais sobre a Consciência Temporal"
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                        >
                            ❓
                        </button>
                    </div>
                    {dateAwareness && (
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Dias Anteriores</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="60"
                                    value={dateAwarenessPastDays} 
                                    onChange={(e) => setDateAwarenessPastDays(Math.max(0, parseInt(e.target.value) || 0))} 
                                    className="time-input" 
                                    style={{ width: '80px', textAlign: 'center' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Dias Posteriores</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="60"
                                    value={dateAwarenessFutureDays} 
                                    onChange={(e) => setDateAwarenessFutureDays(Math.max(0, parseInt(e.target.value) || 0))} 
                                    className="time-input" 
                                    style={{ width: '80px', textAlign: 'center' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Forçar Horário Específico (Opcional)</label>
                                <input type="time" value={simulatedTime} onChange={(e) => setSimulatedTime(e.target.value)} className="time-input" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemporalSection;

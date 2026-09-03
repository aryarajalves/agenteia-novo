import React from 'react';
import { useConfig } from '../ConfigContext';

const UnansweredQuestionsConfigSection = () => {
    const {
        unansweredHandoffEnabled, setUnansweredHandoffEnabled,
        unansweredHandoffLimit, setUnansweredHandoffLimit,
        unansweredQuestionPrompt, setUnansweredQuestionPrompt
    } = useConfig();

    const presets = [
        "Vou verificar essa informação com nossa equipe e já te retorno por aqui!",
        "Essa dúvida específica foi encaminhada para nossos especialistas e logo te responderemos.",
        "Deixei sua pergunta anotada com nosso time. Enquanto isso, posso te ajudar com mais alguma dúvida sobre o curso?"
    ];

    return (
        <div className="advanced-rag-box" style={{ marginTop: '2rem', border: '1px solid rgba(129, 140, 248, 0.25)', background: 'rgba(15, 23, 42, 0.65)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                <label className="box-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span style={{ fontSize: '1.2rem' }}>❓</span>
                    <span>Dúvidas Sem Resposta & Transbordo Humano</span>
                </label>
                <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    background: unansweredHandoffEnabled ? 'rgba(99, 102, 241, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    color: unansweredHandoffEnabled ? '#818cf8' : '#4ade80',
                    border: unansweredHandoffEnabled ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                    fontWeight: 600
                }}>
                    {unansweredHandoffEnabled ? `Transferência Ativa (${unansweredHandoffLimit}x)` : '🛡️ Nunca Transferir por Dúvida'}
                </span>
            </div>

            <p className="empty-msg" style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
                Configure como a IA deve agir ao receber perguntas que não constam na base de conhecimento. Você pode definir o limite de dúvidas para chamar o suporte humano ou desativar totalmente o transbordo por dúvidas.
            </p>

            {/* Switch de Ativação do Transbordo */}
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--wh-border)', 
                borderRadius: '10px', 
                padding: '1rem',
                marginBottom: '1.25rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: '4px' }}>
                            Transferir para suporte humano após limite de dúvidas sem resposta
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--wh-text-secondary)', lineHeight: 1.4 }}>
                            Quando desativado, o robô registrará as dúvidas no banco para análise da equipe, mas <strong>nunca</strong> transferirá para atendentes humanos automaticamente por falta de resposta.
                        </div>
                    </div>
                    <label className="switch" style={{ flexShrink: 0 }}>
                        <input
                            type="checkbox"
                            checked={unansweredHandoffEnabled}
                            onChange={(e) => setUnansweredHandoffEnabled(e.target.checked)}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>

                {/* Se Ativado: Controle de Limite */}
                {unansweredHandoffEnabled && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--wh-text-primary)' }}>
                                Quantidade de dúvidas sem resposta antes de transferir:
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {[1, 2, 3, 5].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setUnansweredHandoffLimit(val)}
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: unansweredHandoffLimit === val ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.03)',
                                            border: unansweredHandoffLimit === val ? '1px solid #818cf8' : '1px solid var(--wh-border)',
                                            color: unansweredHandoffLimit === val ? '#fff' : 'var(--wh-text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {val} {val === 1 ? 'dúvida' : 'dúvidas'}{val === 2 ? ' (padrão)' : ''}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={unansweredHandoffLimit || 2}
                                onChange={(e) => {
                                    const parsed = parseInt(e.target.value);
                                    setUnansweredHandoffLimit(isNaN(parsed) ? 1 : Math.max(1, Math.min(20, parsed)));
                                }}
                                style={{
                                    width: '80px',
                                    padding: '0.45rem 0.65rem',
                                    borderRadius: '8px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--wh-border)',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textAlign: 'center'
                                }}
                            />
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                Na <strong>{unansweredHandoffLimit}ª dúvida sem resposta</strong> na mesma conversa, o robô transferirá para a equipe humana.
                            </span>
                        </div>
                    </div>
                )}

                {/* Se Desativado: Aviso Informativo */}
                {!unansweredHandoffEnabled && (
                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem 1rem', 
                        background: 'rgba(34, 197, 94, 0.08)', 
                        border: '1px solid rgba(34, 197, 94, 0.25)', 
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        color: '#bbf7d0',
                        lineHeight: 1.4
                    }}>
                        🛡️ <strong>Modo 100% Robô Ativo:</strong> O robô nunca chamará o suporte humano por dúvidas não respondidas, continuando a atender o lead normalmente. 
                        <span style={{ display: 'block', marginTop: '4px', opacity: 0.85, fontSize: '0.72rem' }}>
                            (Observação: Se o próprio cliente solicitar atendente humano, cancelamento ou reembolso, a transferência humana continuará funcionando normalmente).
                        </span>
                    </div>
                )}
            </div>

            {/* Custom Response Guideline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                        📝 Diretriz / Modelo de Resposta ao Registrar Dúvida
                    </label>
                    {unansweredQuestionPrompt && (
                        <button
                            type="button"
                            onClick={() => setUnansweredQuestionPrompt('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Limpar / Usar Padrão
                        </button>
                    )}
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--wh-text-secondary)', lineHeight: 1.4 }}>
                    Escreva como você deseja que a IA responda ao cliente quando acionar o registro de dúvidas sem resposta (ex: tom de voz, promessa de retorno, acolhimento):
                </p>

                <textarea
                    style={{
                        width: '100%',
                        minHeight: '85px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--wh-border)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.75rem',
                        color: '#fff',
                        fontSize: '0.8rem',
                        lineHeight: 1.5,
                        resize: 'vertical',
                        fontFamily: 'inherit'
                    }}
                    placeholder="Ex: Diga educadamente que vai verificar essa informação com nossa equipe pedagógica e retornará em breve com todos os detalhes..."
                    value={unansweredQuestionPrompt || ''}
                    onChange={(e) => setUnansweredQuestionPrompt(e.target.value)}
                />

                {/* Sugestões Rápidas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>💡 Sugestões Rápidas:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {presets.map((preset, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setUnansweredQuestionPrompt(preset)}
                                style={{
                                    textAlign: 'left',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    color: '#cbd5e1',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                            >
                                • "{preset}"
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnansweredQuestionsConfigSection;

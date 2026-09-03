import React from 'react';

const SemanticCacheSettingsTab = ({
    semanticCacheEnabled,
    setSemanticCacheEnabled,
    semanticCacheThreshold,
    setSemanticCacheThreshold,
    totalCount = 0,
    totalSavings = 0
}) => {
    const getThresholdLabel = (val) => {
        if (val >= 95) return { text: 'Muito Rigoroso (Quase Idêntico)', color: '#10b981', desc: 'Dispara apenas se a intenção da pergunta for praticamente idêntica à cadastrada.' };
        if (val >= 90) return { text: 'Recomendado (Equilíbrio Perfeito)', color: '#6366f1', desc: 'Ideal para a maioria dos agentes. Reconhece variações naturais mantendo alta precisão.' };
        if (val >= 80) return { text: 'Flexível (Mais Variações)', color: '#eab308', desc: 'Mais tolerante a diferenças de vocabulário e perguntas com termos correlatos.' };
        return { text: 'Amplo (Alta Tolerância)', color: '#f97316', desc: 'Dispara com maior facilidade. Recomendado apenas para respostas genéricas.' };
    };

    const currentLevel = getThresholdLabel(semanticCacheThreshold);

    return (
        <div className="semantic-cache-settings-tab fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Card 1: Ativação Geral */}
            <div className="form-card" style={{
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.45), rgba(15, 23, 42, 0.65))',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '16px',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#fff', margin: 0 }}>
                            ⚡ Status do Cache Semântico
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px', maxWidth: '600px', lineHeight: '1.4' }}>
                            Quando ativo, o agente intercepta perguntas com alta similaridade e responde instantaneamente sem consumir tokens de LLM e com custo R$ 0,00.
                        </p>
                    </div>

                    <label className="switch-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: semanticCacheEnabled ? '#34d399' : '#94a3b8' }}>
                            {semanticCacheEnabled ? 'Ativado' : 'Pausado'}
                        </span>
                        <input
                            type="checkbox"
                            data-testid="semantic-cache-toggle-switch"
                            checked={!!semanticCacheEnabled}
                            onChange={(e) => setSemanticCacheEnabled(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <div style={{
                            width: '50px',
                            height: '28px',
                            borderRadius: '14px',
                            background: semanticCacheEnabled ? '#10b981' : 'rgba(255,255,255,0.15)',
                            position: 'relative',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#fff',
                                position: 'absolute',
                                top: '3px',
                                left: semanticCacheEnabled ? '25px' : '3px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                        </div>
                    </label>
                </div>
            </div>

            {/* Card 2: Limiar de Similaridade Vetorial */}
            <div className="form-card" style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🎯 Similaridade Mínima de Intenção para Disparo
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            {currentLevel.desc}
                        </p>
                    </div>
                    <span style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: currentLevel.color,
                        fontWeight: 800,
                        fontSize: '0.95rem'
                    }}>
                        {semanticCacheThreshold}% — {currentLevel.text}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <input
                        type="range"
                        min="70"
                        max="99"
                        step="1"
                        data-testid="semantic-cache-threshold-slider"
                        value={semanticCacheThreshold}
                        onChange={(e) => setSemanticCacheThreshold(parseInt(e.target.value))}
                        style={{
                            flex: 1,
                            height: '8px',
                            borderRadius: '4px',
                            accentColor: '#6366f1',
                            cursor: 'pointer'
                        }}
                    />
                </div>

                {/* Régua de Referência */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.74rem', color: '#64748b' }}>
                    <span>70% (Amplo)</span>
                    <span>80% (Flexível)</span>
                    <span style={{ color: '#818cf8', fontWeight: 700 }}>90% - 92% (Recomendado)</span>
                    <span>99% (Idêntico)</span>
                </div>
            </div>

            {/* Card 3: Informações de Como Funciona */}
            <div className="form-card" style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
            }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚡</div>
                    <strong style={{ color: '#34d399', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Custo Zero e 0 Tokens</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                        Respostas servidas pelo cache não chamam OpenAI/Anthropic/Gemini, economizando 100% dos custos de LLM.
                    </p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏱️</div>
                    <strong style={{ color: '#38bdf8', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Resposta Instantânea</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                        Tempo de processamento de ~0.05s, entregando uma experiência ultra-rápida no WhatsApp e chat.
                    </p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎯</div>
                    <strong style={{ color: '#a5b4fc', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Vetorização Semântica</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                        Compara a intenção semântica da pergunta usando embeddings neurais com busca em pgvector.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SemanticCacheSettingsTab;

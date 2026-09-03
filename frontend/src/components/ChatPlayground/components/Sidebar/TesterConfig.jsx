import React from 'react';

const TesterConfig = ({
    isTesterMode,
    setIsTesterMode,
    setIsBattleMode,
    testerPersona,
    setTesterPersona,
    testerPersonas,
    customPersona,
    setCustomPersona,
    customQuestionsMode,
    setCustomQuestionsMode,
    customQuestions,
    setCustomQuestions,
    testerMessageCount,
    setTesterMessageCount,
    testerDelay,
    setTesterDelay,
    testerKnowsPrompt,
    setTesterKnowsPrompt,
    testerIsDynamic,
    setTesterIsDynamic,
    isTesterAutoRunning,
    isTesterRunning,
    toggleAutoTester,
    loading
}) => {
    const parsedQuestionsCount = customQuestions
        ? customQuestions.split('\n').map(q => q.trim()).filter(q => q.length > 0).length
        : 0;

    return (
        <div className={`tester-config-box ${isTesterMode ? 'active' : ''}`}>
            <div 
                className="tester-header-toggle" 
                onClick={() => {
                    const next = !isTesterMode;
                    setIsTesterMode(next);
                    if (next) setIsBattleMode(false);
                }}
            >
                <div className="tester-header-title">
                    <span>🎯</span>
                    <span>Stress Test (Tester AI)</span>
                </div>
                <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                    <input 
                        type="checkbox" 
                        checked={isTesterMode} 
                        onChange={(e) => {
                            setIsTesterMode(e.target.checked);
                            if (e.target.checked) setIsBattleMode(false);
                        }} 
                    />
                    <span className="slider round" style={{ backgroundColor: isTesterMode ? '#f43f5e' : '' }}></span>
                </label>
            </div>

            {isTesterMode && (
                <div className="tester-controls fade-in">
                    {/* Modo de Perguntas Personalizadas */}
                    <div 
                        className={`tester-toggle-card ${customQuestionsMode ? 'active' : ''}`}
                        onClick={() => setCustomQuestionsMode(!customQuestionsMode)}
                        style={{ borderLeft: customQuestionsMode ? '3px solid #f43f5e' : undefined }}
                    >
                        <div className="tester-toggle-info">
                            <div className="tester-toggle-title">
                                <span>📝</span> Roteiro de Perguntas Personalizadas
                            </div>
                            <div className="tester-toggle-desc">
                                Escolha exatamente quais perguntas enviar pro chat.
                            </div>
                        </div>
                        <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                            <input 
                                type="checkbox" 
                                checked={customQuestionsMode} 
                                onChange={(e) => setCustomQuestionsMode(e.target.checked)} 
                            />
                            <span className="slider round" style={{ backgroundColor: customQuestionsMode ? '#f43f5e' : '' }}></span>
                        </label>
                    </div>

                    {customQuestionsMode ? (
                        <div className="custom-questions-box fade-in">
                            <div className="custom-questions-header">
                                <label className="tester-label" style={{ marginBottom: 0 }}>
                                    <span>📋</span> PERGUNTAS (1 POR LINHA)
                                </label>
                                <span className="question-count-badge">
                                    💬 {parsedQuestionsCount} {parsedQuestionsCount === 1 ? 'pergunta' : 'perguntas'}
                                </span>
                            </div>
                            <textarea
                                value={customQuestions}
                                onChange={(e) => setCustomQuestions(e.target.value)}
                                placeholder="Digite ou cole suas perguntas aqui (uma por linha):&#10;Qual o valor do curso?&#10;Tem garantia de reembolso?&#10;Como funciona o suporte?"
                                className="custom-questions-textarea"
                                rows={5}
                            />
                            <p className="custom-questions-hint">
                                💡 O robô enviará cada pergunta em sequência aguardando a resposta da IA.
                            </p>

                            <div className="tester-params-grid" style={{ marginTop: '0.75rem' }}>
                                <div className="tester-param-card" style={{ gridColumn: '1 / -1' }}>
                                    <label>⏱️ Delay entre mensagens (Segs)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={testerDelay}
                                        onChange={(e) => setTesterDelay(Number(e.target.value))}
                                        className="tester-param-input"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="tester-label">
                                    <span>🎭</span> PERSONA DO TESTADOR
                                </label>
                                <select
                                    value={testerPersona}
                                    onChange={(e) => setTesterPersona(e.target.value)}
                                    className="tester-select"
                                >
                                    {Object.entries(testerPersonas).map(([id, p]) => (
                                        <option key={id} value={id}>{p.name}</option>
                                    ))}
                                </select>
                                {testerPersonas[testerPersona]?.description && (
                                    <div className="persona-desc-box fade-in">
                                        {testerPersonas[testerPersona].description}
                                    </div>
                                )}
                            </div>

                            {testerPersona === 'custom' && (
                                <div>
                                    <label className="tester-label">
                                        <span>✍️</span> PROMPT DA PERSONA CUSTOMIZADA
                                    </label>
                                    <textarea
                                        value={customPersona}
                                        onChange={(e) => setCustomPersona(e.target.value)}
                                        placeholder="Ex: Você é um médico aposentado que não tem paciência para tecnologia..."
                                        className="context-input"
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="tester-params-grid">
                                <div className="tester-param-card">
                                    <label>💬 Nº Mensagens</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={testerMessageCount}
                                        onChange={(e) => setTesterMessageCount(Number(e.target.value))}
                                        className="tester-param-input"
                                    />
                                </div>
                                <div className="tester-param-card">
                                    <label>⏱️ Delay (Segs)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={testerDelay}
                                        onChange={(e) => setTesterDelay(Number(e.target.value))}
                                        className="tester-param-input"
                                    />
                                </div>
                            </div>

                            <div className="tester-toggles-list">
                                <div 
                                    className={`tester-toggle-card ${testerKnowsPrompt ? 'active' : ''}`}
                                    onClick={() => setTesterKnowsPrompt(!testerKnowsPrompt)}
                                >
                                    <div className="tester-toggle-info">
                                        <div className="tester-toggle-title">
                                            <span>📖</span> Modo White Box
                                        </div>
                                        <div className="tester-toggle-desc">
                                            O Tester lerá o prompt do agente antes.
                                        </div>
                                    </div>
                                    <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={testerKnowsPrompt} 
                                            onChange={(e) => setTesterKnowsPrompt(e.target.checked)} 
                                        />
                                        <span className="slider round" style={{ backgroundColor: testerKnowsPrompt ? '#f43f5e' : '' }}></span>
                                    </label>
                                </div>

                                <div 
                                    className={`tester-toggle-card ${testerIsDynamic ? 'active' : ''}`}
                                    onClick={() => setTesterIsDynamic(!testerIsDynamic)}
                                >
                                    <div className="tester-toggle-info">
                                        <div className="tester-toggle-title">
                                            <span>🌀</span> Modo Bipolar
                                        </div>
                                        <div className="tester-toggle-desc">
                                            O humor muda conforme a conversa.
                                        </div>
                                    </div>
                                    <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={testerIsDynamic} 
                                            onChange={(e) => setTesterIsDynamic(e.target.checked)} 
                                        />
                                        <span className="slider round" style={{ backgroundColor: testerIsDynamic ? '#f43f5e' : '' }}></span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        className={`start-tester-btn-modern ${isTesterAutoRunning ? 'running' : 'idle'}`}
                        onClick={toggleAutoTester}
                        disabled={loading && !isTesterAutoRunning}
                    >
                        {isTesterAutoRunning 
                            ? '⏹️ Parar Teste' 
                            : (isTesterRunning 
                                ? '⏳ Pensando...' 
                                : (customQuestionsMode 
                                    ? `🚀 Enviar Roteiro (${parsedQuestionsCount})` 
                                    : '🚀 Iniciar Stress Test'))}
                    </button>
                    <p className="tester-footer-tip">
                        {customQuestionsMode 
                            ? 'As perguntas serão enviadas automaticamente como mensagens do usuário.'
                            : 'A IA assumirá o papel de cliente interagindo em loop contínuo.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default TesterConfig;

import React from 'react';
import { getTesterPersonas } from '../../utils/constants';
import TesterConfig from './TesterConfig';
import ModelConfig from './ModelConfig';
import ContextConfig from './ContextConfig';
import SessionStats from './SessionStats';
import HistoryList from './HistoryList';

const Sidebar = ({
    activeTab,
    setActiveTab,
    setShowGuide,
    agents,
    selectedAgentId,
    isBattleMode,
    setIsBattleMode,
    isTesterMode,
    setIsTesterMode,
    testerSentiment,
    testerPersona,
    setTesterPersona,
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
    loading,
    mainModelOverride,
    setMainModelOverride,
    availableModels,
    challengerModelOverride,
    setChallengerModelOverride,
    challengerAgentId,
    globalVars,
    contextVars,
    setContextVars,
    sessionId,
    showToast,
    sessionStats,
    handleReset,
    sessions,
    historyFilter,
    setHistoryFilter,
    isSelectionMode,
    toggleSelectionMode,
    selectedSessions,
    toggleSelectAll,
    setShowDeleteConfirm,
    extractBatchQuestions,
    toggleSessionSelection,
    loadSession
}) => {
    const testerPersonas = getTesterPersonas(customPersona);

    return (
        <aside className="playground-sidebar">
            <div className="sidebar-tabs">
                <button
                    className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
                    onClick={() => setActiveTab('test')}
                >
                    🧪 Testar
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📜 History
                </button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'test' ? (
                    <>
                        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>🧪 Laboratório</h3>
                                <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>Ambiente de Stress Test</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide(true)}
                                className="guide-trigger-btn"
                            >
                                <span>📖</span><span>Guia</span>
                            </button>
                        </div>

                        <div className="battle-toggle-premium">
                            <label className="toggle-switch" htmlFor="arena-toggle">
                                <input id="arena-toggle" type="checkbox" checked={isBattleMode} onChange={(e) => {
                                    setIsBattleMode(e.target.checked);
                                    if (e.target.checked) setIsTesterMode(false);
                                }} />
                                <span className="slider round"></span>
                            </label>
                            <label htmlFor="arena-toggle" className="toggle-label" style={{ cursor: 'pointer' }}>Arena A/B Testing</label>
                        </div>

                        {/* SENTIMENT METER GLOBAL */}
                        <div className="sentiment-meter">
                            <div className="sentiment-meta">
                                <span>Paciência do Cliente</span>
                                <span style={{ color: testerSentiment < 30 ? '#ef4444' : (testerSentiment > 70 ? '#10b981' : '#f59e0b') }}>{testerSentiment}%</span>
                            </div>
                            <div className="sentiment-bar-track">
                                <div className="sentiment-bar-fill" style={{
                                    width: `${testerSentiment}%`,
                                    backgroundColor: testerSentiment < 30 ? '#ef4444' : (testerSentiment > 70 ? '#10b981' : '#f59e0b')
                                }}></div>
                            </div>
                        </div>

                        <TesterConfig
                            isTesterMode={isTesterMode}
                            setIsTesterMode={setIsTesterMode}
                            setIsBattleMode={setIsBattleMode}
                            testerPersona={testerPersona}
                            setTesterPersona={setTesterPersona}
                            testerPersonas={testerPersonas}
                            customPersona={customPersona}
                            setCustomPersona={setCustomPersona}
                            customQuestionsMode={customQuestionsMode}
                            setCustomQuestionsMode={setCustomQuestionsMode}
                            customQuestions={customQuestions}
                            setCustomQuestions={setCustomQuestions}
                            testerMessageCount={testerMessageCount}
                            setTesterMessageCount={setTesterMessageCount}
                            testerDelay={testerDelay}
                            setTesterDelay={setTesterDelay}
                            testerKnowsPrompt={testerKnowsPrompt}
                            setTesterKnowsPrompt={setTesterKnowsPrompt}
                            testerIsDynamic={testerIsDynamic}
                            setTesterIsDynamic={setTesterIsDynamic}
                            isTesterAutoRunning={isTesterAutoRunning}
                            isTesterRunning={isTesterRunning}
                            toggleAutoTester={toggleAutoTester}
                            loading={loading}
                        />

                        <ModelConfig
                            mainModelOverride={mainModelOverride}
                            setMainModelOverride={setMainModelOverride}
                            availableModels={availableModels}
                            isBattleMode={isBattleMode}
                            challengerModelOverride={challengerModelOverride}
                            setChallengerModelOverride={setChallengerModelOverride}
                        />

                        <ContextConfig
                            globalVars={globalVars}
                            contextVars={contextVars}
                            setContextVars={setContextVars}
                        />

                        <SessionStats
                            sessionId={sessionId}
                            sessionStats={sessionStats}
                            showToast={showToast}
                        />

                        <button onClick={handleReset} className="reset-btn">⚡ Resetar</button>
                    </>

                ) : (
                    <HistoryList
                        sessions={sessions}
                        historyFilter={historyFilter}
                        setHistoryFilter={setHistoryFilter}
                        isSelectionMode={isSelectionMode}
                        toggleSelectionMode={toggleSelectionMode}
                        selectedSessions={selectedSessions}
                        toggleSelectAll={toggleSelectAll}
                        setShowDeleteConfirm={setShowDeleteConfirm}
                        extractBatchQuestions={extractBatchQuestions}
                        toggleSessionSelection={toggleSessionSelection}
                        loadSession={loadSession}
                        currentSessionId={sessionId}
                    />
                )}
            </div>
        </aside>
    );
};

export default Sidebar;

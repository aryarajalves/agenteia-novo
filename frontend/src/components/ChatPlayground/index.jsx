import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';

// Hooks
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';
import { useTester } from './hooks/useTester';
import { useFeedback } from './hooks/useFeedback';

// Components
import Sidebar from './components/Sidebar';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import AnalysisModal from './components/AnalysisModal';
import CorrectionModal from './components/CorrectionModal';
import TesterReportModal from './components/TesterReportModal';
import PlaygroundGuide from './components/PlaygroundGuide';
import HotfixPanel from './components/HotfixPanel';
import ConfirmModal from '../ConfirmModal';

// Styles
import './styles/ChatPlayground.css';
import './styles/Sidebar.css';
import './styles/Messages.css';
import './styles/Modals.css';

const ChatPlayground = () => {
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const agentIdFromQuery = queryParams.get('agentId');
    const initialSessionId = queryParams.get('session_id');

    // Core Data State
    const [agents, setAgents] = useState([]);
    const [globalVars, setGlobalVars] = useState([]);
    const [availableModels] = useState(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'o1-mini']);
    const [loadingAgents, setLoadingAgents] = useState(true);

    // Navigation/Session State
    const [selectedAgentId, setSelectedAgentId] = useState(agentIdFromQuery || '');
    const [sessionId, setSessionId] = useState(initialSessionId || Math.random().toString(36).substring(7));
    const [isBattleMode, setIsBattleMode] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Model & Prompt State
    const [mainModelOverride, setMainModelOverride] = useState('');
    const [challengerModelOverride, setChallengerModelOverride] = useState('');
    const [challengerAgentId, setChallengerAgentId] = useState('');
    const [showHotfix, setShowHotfix] = useState(false);
    const [hotfixPrompt, setHotfixPrompt] = useState('');
    const [showChallengerHotfix, setShowChallengerHotfix] = useState(false);
    const [challengerHotfixPrompt, setChallengerHotfixPrompt] = useState('');

    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    const [contextVars, setContextVars] = useState({});

    // Tester States (Shared to break circular dependency)
    const [testerSentiment, setTesterSentiment] = useState(50);
    const [testerReport, setTesterReport] = useState(null);
    const [hasTesterReport, setHasTesterReport] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
    };

    // Fetch Agents and Globals
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [agentsRes, globalsRes] = await Promise.all([
                    api.get('/agents'),
                    api.get('/global-variables')
                ]);
                
                const agentsData = await agentsRes.json();
                const globalsData = await globalsRes.json();
                
                setAgents(agentsData);
                setGlobalVars(globalsData);
                
                if (!selectedAgentId && agentsData.length > 0) {
                    setSelectedAgentId(agentsData[0].id);
                }
            } catch (err) {
                console.error("Erro ao buscar dados iniciais:", err);
                showToast("Erro ao carregar dados", "error");
            } finally {
                setLoadingAgents(false);
            }
        };
        fetchData();
    }, [selectedAgentId]);

    const {
        sessions,
        historyFilter, setHistoryFilter,
        isSelectionMode, toggleSelectionMode,
        selectedSessions, toggleSessionSelection,
        toggleSelectAll,
        showDeleteConfirm, setShowDeleteConfirm,
        executeDelete,
        fetchSessions,
        activeTab,
        setActiveTab
    } = useSessions({ 
        selectedAgentId, 
        sessionId, 
        handleReset: () => chat.handleReset(), 
        showToast 
    });

    // Chat Hook
    const chat = useChat({
        selectedAgentId,
        sessionId,
        setSessionId,
        challengerAgentId,
        isBattleMode,
        mainModelOverride,
        challengerModelOverride,
        showHotfix,
        hotfixPrompt,
        showChallengerHotfix,
        challengerHotfixPrompt,
        contextVars,
        showToast,
        setTesterSentiment,
        setHasTesterReport,
        setTesterReport,
        onMessageSent: fetchSessions
    });

    const {
        messages, setMessages,
        battleMessages,
        loading,
        sessionStats,
        handleSendMessage,
        handleReset,
        loadSession,
        scrollRef,
        battleScrollRef,
        isViewMode,
        analysisData,
        setAnalysisData,
        fetchSummary
    } = chat;

    // Tester Hook
    const tester = useTester({
        selectedAgentId,
        agents,
        sessionId,
        messagesRef: chat.messagesRef,
        handleSendMessage,
        showToast,
        testerSentiment, setTesterSentiment,
        testerReport, setTesterReport,
        hasTesterReport, setHasTesterReport
    });

    const {
        isTesterMode, setIsTesterMode,
        testerPersona, setTesterPersona,
        customPersona, setCustomPersona,
        testerMessageCount, setTesterMessageCount,
        testerDelay, setTesterDelay,
        testerKnowsPrompt, setTesterKnowsPrompt,
        testerIsDynamic, setTesterIsDynamic,
        isTesterAutoRunning,
        isTesterRunning,
        toggleAutoTester,
        fetchTestReport,
        generateTestReport
    } = tester;

    // Feedback/Correction Hook
    const {
        feedbackState,
        readFbFromStorage,
        correctionModal, setCorrectionModal,
        handleThumbsUp,
        handleThumbsDown,
        saveCorrection
    } = useFeedback({
        selectedAgentId,
        agents,
        messages,
        setMessages,
        showToast
    });

    // Efeito para carregar as sessões (Histórico)
    useEffect(() => {
        if (selectedAgentId && activeTab === 'history') {
            fetchSessions();
        }
    }, [selectedAgentId, activeTab, fetchSessions]);

    if (loadingAgents || isNavigating) {
        return createPortal(
            <div className="playground-loading-overlay">
                <div className="loading-card">
                    <div className="premium-spinner"></div>
                    <p>{isNavigating ? 'Abrindo configurações do agente...' : 'Preparando ambiente de teste...'}</p>
                    <div className="loading-progress-bar">
                        <div className="progress-fill"></div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return (
        <div className="playground-container fade-in">
            {isSidebarOpen && (
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setShowGuide={setShowGuide}
                    agents={agents}
                    selectedAgentId={selectedAgentId}
                    setSelectedAgentId={setSelectedAgentId}
                    isBattleMode={isBattleMode}
                    setIsBattleMode={setIsBattleMode}
                    isTesterMode={isTesterMode}
                    setIsTesterMode={setIsTesterMode}
                    testerSentiment={testerSentiment}
                    testerPersona={testerPersona}
                    setTesterPersona={setTesterPersona}
                    customPersona={customPersona}
                    setCustomPersona={setCustomPersona}
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
                    mainModelOverride={mainModelOverride}
                    setMainModelOverride={setMainModelOverride}
                    availableModels={availableModels}
                    challengerModelOverride={challengerModelOverride}
                    setChallengerModelOverride={setChallengerModelOverride}
                    challengerAgentId={challengerAgentId}
                    setChallengerAgentId={setChallengerAgentId}
                    globalVars={globalVars}
                    contextVars={contextVars}
                    setContextVars={setContextVars}
                    sessionId={sessionId}
                    showToast={showToast}
                    sessionStats={sessionStats}
                    handleReset={handleReset}
                    sessions={sessions}
                    historyFilter={historyFilter}
                    setHistoryFilter={setHistoryFilter}
                    isSelectionMode={isSelectionMode}
                    toggleSelectionMode={toggleSelectionMode}
                    selectedSessions={selectedSessions}
                    toggleSelectAll={toggleSelectAll}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    toggleSessionSelection={toggleSessionSelection}
                    loadSession={loadSession}
                    extractBatchQuestions={() => showToast("Extração em lote em desenvolvimento", "info")}
                />
            )}

            <div className="chat-area-wrapper">
                <div className="chat-premium-header fade-in">
                    <div className="agent-brand">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="edit-prompt-link"
                            style={{ marginRight: '10px' }}
                            title={isSidebarOpen ? "Ocultar Painel Lateral" : "Exibir Painel Lateral"}
                        >
                            {isSidebarOpen ? '◀ Ocultar Painel' : '⚙️ Exibir Painel'}
                        </button>
                        <div className="agent-avatar-status">
                            <div className="avatar-mini">🤖</div>
                            <span className="status-dot"></span>
                        </div>
                        <div className="agent-meta-title">
                            <h3>{agents.find(a => a.id == selectedAgentId)?.name || 'Agente Inteligente'}</h3>
                            <p>Assistente Virtual Nativo</p>
                        </div>
                        {selectedAgentId && (
                            <div className="header-actions-row">
                                <button
                                    onClick={() => {
                                        setIsNavigating(true);
                                        window.location.href = `/agent/${selectedAgentId}?tab=prompts`;
                                    }}
                                    className="edit-prompt-link"
                                >
                                    ✏️ Editar Prompt
                                </button>
                                {isBattleMode && (
                                    <button 
                                        className={`hotfix-toggle ${showChallengerHotfix ? 'active' : ''}`}
                                        onClick={() => setShowChallengerHotfix(!showChallengerHotfix)}
                                    >
                                        🥊 Prompt Desafiante
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <HotfixPanel 
                    show={showChallengerHotfix} 
                    setShow={setShowChallengerHotfix}
                    title="🥊 Prompt Desafiante"
                    value={challengerHotfixPrompt}
                    onChange={setChallengerHotfixPrompt}
                    placeholder="Edite o Prompt do desafiante aqui..."
                    tip="Este prompt será usado apenas nesta sessão da Arena."
                    isChallenger={true}
                />

                <HotfixPanel 
                    show={showHotfix} 
                    setShow={setShowHotfix}
                    title="✏️ Prompt Principal (Hotfix)"
                    value={hotfixPrompt}
                    onChange={setHotfixPrompt}
                    placeholder="Edite o Prompt principal aqui..."
                    tip="Este hotfix é temporário e não altera as configurações permanentes."
                />

                <div className={`chat-area-container ${isBattleMode ? 'split-view' : ''}`}>
                    <MessageList 
                        isBattleMode={isBattleMode}
                        messages={messages}
                        battleMessages={battleMessages}
                        loading={loading}
                        agents={agents}
                        selectedAgentId={selectedAgentId}
                        challengerAgentId={challengerAgentId}
                        mainModelOverride={mainModelOverride}
                        challengerModelOverride={challengerModelOverride}
                        scrollRef={scrollRef}
                        battleScrollRef={battleScrollRef}
                        feedbackState={feedbackState}
                        handleThumbsUp={handleThumbsUp}
                        handleThumbsDown={handleThumbsDown}
                        readFbFromStorage={readFbFromStorage}
                        isRegularUser={false}
                    />
                </div>

                {!isViewMode && (
                    <InputArea 
                        {...chat}
                        isInputExpanded={isInputExpanded}
                        setIsInputExpanded={setIsInputExpanded}
                        isTesterAutoRunning={isTesterAutoRunning}
                        isRegularUser={false}
                    />
                )}

                {toast.show && createPortal(
                    <div className={`toast-notification fade-in ${toast.type}`}>
                        <span>{toast.type === 'error' ? '❌' : (toast.type === 'success' ? '✅' : 'ℹ️')}</span>
                        <span>{toast.message}</span>
                    </div>,
                    document.body
                )}
            </div>

            <AnalysisModal data={analysisData} onClose={() => setAnalysisData({ show: false, content: '', type: '' })} />
            <CorrectionModal modal={correctionModal} setModal={setCorrectionModal} onSubmit={saveCorrection} />
            <TesterReportModal report={testerReport} onClose={() => setTesterReport(null)} />
            <PlaygroundGuide showGuide={showGuide} setShowGuide={setShowGuide} />
            
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Excluir Sessões"
                message={`Tem certeza que deseja excluir ${selectedSessions.size} sessões selecionadas? Esta ação é irreversível.`}
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                type="danger"
            />
        </div>
    );
};

export default ChatPlayground;

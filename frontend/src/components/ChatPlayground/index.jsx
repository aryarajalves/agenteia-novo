import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';

// Hooks
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';
import { useTester } from './hooks/useTester';
import { useFeedback } from './hooks/useFeedback';
import { exportConversationForTraining } from './utils/exportTraining';

// Components
import Sidebar from './components/Sidebar';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import ChallengerPromptEditor from './components/ChallengerPromptEditor';
import AnalysisModal from './components/AnalysisModal';
import CorrectionModal from './components/CorrectionModal';
import ApproveCacheModal from './components/ApproveCacheModal';
import TesterReportModal from './components/TesterReportModal';
import PlaygroundGuide from './components/PlaygroundGuide';
import HotfixPanel from './components/HotfixPanel';
import ConfirmModal from '../ConfirmModal';
import { estimateTokens, formatTokenCount } from './utils/tokenUtils';

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
    const [availableModels, setAvailableModels] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(true);

    // Navigation/Session State
    const [selectedAgentId, setSelectedAgentId] = useState(agentIdFromQuery || '');
    const [sessionId, setSessionId] = useState(initialSessionId || Math.random().toString(36).substring(7));
    const [isBattleMode, setIsBattleMode] = useState(false);
    const [battleTab, setBattleTab] = useState('chat'); // 'chat' | 'prompt'
    const [showGuide, setShowGuide] = useState(false);

    // Model & Prompt State
    const [mainModelOverride, setMainModelOverride] = useState('');
    const [challengerModelOverride, setChallengerModelOverride] = useState('');
    const [challengerAgentId, setChallengerAgentId] = useState('');
    const [showHotfix, setShowHotfix] = useState(false);
    const [hotfixPrompt, setHotfixPrompt] = useState('');
    const [challengerHotfixPrompt, setChallengerHotfixPrompt] = useState('');
    const [showResetChatConfirm, setShowResetChatConfirm] = useState(false);

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

    // Fetch Agents, Globals and Models
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [agentsRes, globalsRes, modelsRes] = await Promise.all([
                    api.get('/agents'),
                    api.get('/global-variables'),
                    api.get('/models')
                ]);
                
                const agentsData = await agentsRes.json();
                const globalsData = await globalsRes.json();
                const modelsData = await modelsRes.json();
                
                setAgents(agentsData);
                setGlobalVars(globalsData);

                const modelsList = (modelsData?.models || []).map(m => m.id);
                setAvailableModels(modelsList.length > 0 ? modelsList : ['gpt-5', 'gpt-5-mini', 'gpt-5.2', 'gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1-mini']);
                
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
        customQuestionsMode, setCustomQuestionsMode,
        customQuestions, setCustomQuestions,
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
        cacheConfirmModal,
        confirmSaveToCache,
        linkToExistingCache,
        cancelSaveToCache,
        savingFeedback,
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

    const handleExportTraining = () => {
        exportConversationForTraining({
            messages,
            sessionId,
            selectedAgentId,
            agents,
            showToast
        });
    };

    const handleConfirmResetChat = () => {
        handleReset();
        if (chat.setInput) chat.setInput('');
        if (chat.setSelectedImage) chat.setSelectedImage(null);
        if (chat.setImagePreview) chat.setImagePreview(null);
        setShowResetChatConfirm(false);
    };

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
                            className="toggle-sidebar-btn"
                            title={isSidebarOpen ? "Ocultar Painel Lateral" : "Exibir Painel Lateral"}
                        >
                            {isSidebarOpen ? '◀' : '⚙️ Painel'}
                        </button>
                        <div className="agent-avatar-status">
                            <div className="avatar-mini">🤖</div>
                            <span className="status-dot"></span>
                        </div>
                        <div className="agent-meta-title">
                            <h3>{agents.find(a => a.id == selectedAgentId)?.name || 'Agente'}</h3>
                        </div>
                    </div>

                    {isBattleMode && (
                        <div className="arena-tabs-header">
                            <button 
                                type="button"
                                className={`arena-tab-btn ${battleTab === 'chat' ? 'active' : ''}`}
                                onClick={() => setBattleTab('chat')}
                                data-testid="arena-tab-chat"
                            >
                                💬 Arena
                            </button>
                            <button 
                                type="button"
                                className={`arena-tab-btn challenger-tab ${battleTab === 'prompt' ? 'active' : ''}`}
                                onClick={() => setBattleTab('prompt')}
                                data-testid="arena-tab-prompt"
                            >
                                🥊 Desafiante
                                {challengerHotfixPrompt && (
                                    <span className="arena-tab-badge">
                                        ~{formatTokenCount(estimateTokens(challengerHotfixPrompt))}t
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="header-actions-row">
                        <button
                            onClick={() => setShowResetChatConfirm(true)}
                            className="reset-chat-btn"
                            title="Resetar conversa atual com o agente"
                            data-testid="reset-chat-header-btn"
                        >
                            🔄 Resetar
                        </button>
                        <button
                            onClick={handleExportTraining}
                            className="export-training-btn"
                            title="Exportar conversa completa em formato HTML para estudar e melhorar o prompt"
                            data-testid="export-training-btn"
                        >
                            📄 Exportar
                        </button>
                        {selectedAgentId && (
                            <button
                                onClick={() => {
                                    setIsNavigating(true);
                                    window.location.href = `/agent/${selectedAgentId}?tab=prompts`;
                                }}
                                className="edit-prompt-link"
                                data-testid="edit-prompt-header-btn"
                                title="Editar Prompt do Agente"
                            >
                                ✏️ Prompt
                            </button>
                        )}
                    </div>
                </div>

                {isBattleMode && battleTab === 'prompt' ? (
                    <ChallengerPromptEditor
                        value={challengerHotfixPrompt}
                        onChange={setChallengerHotfixPrompt}
                        onBackToChat={() => setBattleTab('chat')}
                        mainAgentPrompt={agents.find(a => a.id == selectedAgentId)?.system_prompt || ''}
                        agentName={agents.find(a => a.id == selectedAgentId)?.name || 'Agente'}
                    />
                ) : (
                    <>
                        <HotfixPanel 
                            show={showHotfix} 
                            setShow={setShowHotfix}
                            title="✏️ Prompt Principal (Hotfix)"
                            value={hotfixPrompt}
                            onChange={setHotfixPrompt}
                            placeholder="Edite o Prompt principal aqui..."
                            tip="Este hotfix é temporário e não altera as configurações permanentes."
                        />

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

                        {!isViewMode && (
                            <InputArea 
                                {...chat}
                                isInputExpanded={isInputExpanded}
                                setIsInputExpanded={setIsInputExpanded}
                                isTesterAutoRunning={isTesterAutoRunning}
                                isRegularUser={false}
                            />
                        )}
                    </>
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
            <ApproveCacheModal
                modal={cacheConfirmModal}
                agentId={selectedAgentId}
                onConfirm={confirmSaveToCache}
                onLinkExisting={linkToExistingCache}
                onCancel={cancelSaveToCache}
                isSaving={savingFeedback}
            />
            <TesterReportModal report={testerReport} onClose={() => setTesterReport(null)} />
            <PlaygroundGuide showGuide={showGuide} setShowGuide={setShowGuide} />
            
            <ConfirmModal
                isOpen={showResetChatConfirm}
                title="Resetar Conversa"
                message="Tem certeza que deseja resetar a conversa atual? Todas as mensagens serão limpas e uma nova sessão será iniciada."
                onConfirm={handleConfirmResetChat}
                onCancel={() => setShowResetChatConfirm(false)}
                confirmText="Resetar"
                type="danger"
            />
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

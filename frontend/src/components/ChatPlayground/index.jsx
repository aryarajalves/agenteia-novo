import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Hooks
import { usePlaygroundInit } from './hooks/usePlaygroundInit';
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';
import { useTester } from './hooks/useTester';
import { useFeedback } from './hooks/useFeedback';
import { exportConversationForTraining } from './utils/exportTraining';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import ChallengerPromptEditor from './components/ChallengerPromptEditor';
import HotfixPanel from './components/HotfixPanel';
import PlaygroundModals from './components/PlaygroundModals';
import PlaygroundLoadingOverlay from './components/PlaygroundLoadingOverlay';

// Styles
import './styles/ChatPlayground.css';
import './styles/Sidebar.css';
import './styles/Messages.css';
import './styles/Modals.css';

const ChatPlayground = () => {
    const {
        agents,
        globalVars,
        availableModels,
        loadingAgents,
        selectedAgentId,
        setSelectedAgentId,
        sessionId,
        setSessionId,
        toast,
        showToast,
        isNavigating,
        setIsNavigating
    } = usePlaygroundInit();

    // Mode & Navigation State
    const [isBattleMode, setIsBattleMode] = useState(false);
    const [battleTab, setBattleTab] = useState('chat'); // 'chat' | 'prompt'
    const [showGuide, setShowGuide] = useState(false);

    // Model & Hotfix State
    const [mainModelOverride, setMainModelOverride] = useState('');
    const [challengerModelOverride, setChallengerModelOverride] = useState('');
    const [challengerAgentId, setChallengerAgentId] = useState('');
    const [showHotfix, setShowHotfix] = useState(false);
    const [hotfixPrompt, setHotfixPrompt] = useState('');
    const [challengerHotfixPrompt, setChallengerHotfixPrompt] = useState('');
    const [showResetChatConfirm, setShowResetChatConfirm] = useState(false);

    // Layout & Context State
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [contextVars, setContextVars] = useState({});

    // Tester States
    const [testerSentiment, setTesterSentiment] = useState(50);
    const [testerReport, setTesterReport] = useState(null);
    const [hasTesterReport, setHasTesterReport] = useState(false);

    // Sessions Hook
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
        setAnalysisData
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
        toggleAutoTester
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
        return <PlaygroundLoadingOverlay isNavigating={isNavigating} />;
    }

    const currentAgent = agents.find(a => a.id == selectedAgentId);

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
                <Header
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    agents={agents}
                    selectedAgentId={selectedAgentId}
                    isBattleMode={isBattleMode}
                    battleTab={battleTab}
                    setBattleTab={setBattleTab}
                    challengerHotfixPrompt={challengerHotfixPrompt}
                    setShowResetChatConfirm={setShowResetChatConfirm}
                    handleExportTraining={handleExportTraining}
                    setIsNavigating={setIsNavigating}
                />

                {isBattleMode && battleTab === 'prompt' ? (
                    <ChallengerPromptEditor
                        value={challengerHotfixPrompt}
                        onChange={setChallengerHotfixPrompt}
                        onBackToChat={() => setBattleTab('chat')}
                        mainAgentPrompt={currentAgent?.system_prompt || ''}
                        agentName={currentAgent?.name || 'Agente'}
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

            <PlaygroundModals
                analysisData={analysisData}
                setAnalysisData={setAnalysisData}
                correctionModal={correctionModal}
                setModal={setCorrectionModal}
                saveCorrection={saveCorrection}
                cacheConfirmModal={cacheConfirmModal}
                selectedAgentId={selectedAgentId}
                confirmSaveToCache={confirmSaveToCache}
                linkToExistingCache={linkToExistingCache}
                cancelSaveToCache={cancelSaveToCache}
                savingFeedback={savingFeedback}
                testerReport={testerReport}
                setTesterReport={setTesterReport}
                showGuide={showGuide}
                setShowGuide={setShowGuide}
                showResetChatConfirm={showResetChatConfirm}
                setShowResetChatConfirm={setShowResetChatConfirm}
                handleConfirmResetChat={handleConfirmResetChat}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                selectedSessions={selectedSessions}
                executeDelete={executeDelete}
            />
        </div>
    );
};

export default ChatPlayground;

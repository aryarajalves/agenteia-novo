import React from 'react';
import AnalysisModal from './AnalysisModal';
import CorrectionModal from './CorrectionModal';
import ApproveCacheModal from './ApproveCacheModal';
import TesterReportModal from './TesterReportModal';
import PlaygroundGuide from './PlaygroundGuide';
import ConfirmModal from '../../ConfirmModal';

const PlaygroundModals = ({
    analysisData,
    setAnalysisData,
    correctionModal,
    setCorrectionModal,
    saveCorrection,
    cacheConfirmModal,
    selectedAgentId,
    confirmSaveToCache,
    linkToExistingCache,
    cancelSaveToCache,
    savingFeedback,
    testerReport,
    setTesterReport,
    showGuide,
    setShowGuide,
    showResetChatConfirm,
    setShowResetChatConfirm,
    handleConfirmResetChat,
    showDeleteConfirm,
    setShowDeleteConfirm,
    selectedSessions,
    executeDelete
}) => {
    return (
        <>
            <AnalysisModal 
                data={analysisData} 
                onClose={() => setAnalysisData({ show: false, content: '', type: '' })} 
            />
            
            <CorrectionModal 
                modal={correctionModal} 
                setModal={setCorrectionModal} 
                onSubmit={saveCorrection} 
            />
            
            <ApproveCacheModal
                modal={cacheConfirmModal}
                agentId={selectedAgentId}
                onConfirm={confirmSaveToCache}
                onLinkExisting={linkToExistingCache}
                onCancel={cancelSaveToCache}
                isSaving={savingFeedback}
            />
            
            <TesterReportModal 
                report={testerReport} 
                onClose={() => setTesterReport(null)} 
            />
            
            <PlaygroundGuide 
                showGuide={showGuide} 
                setShowGuide={setShowGuide} 
            />
            
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
                message={`Tem certeza que deseja excluir ${selectedSessions?.size || 0} sessões selecionadas? Esta ação é irreversível.`}
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Excluir"
                type="danger"
            />
        </>
    );
};

export default PlaygroundModals;


import React from 'react';
import ReactDOM from 'react-dom';
import LinkExistingCacheSection from '../../../ChatPlayground/components/LinkExistingCacheSection';
import FullscreenTextareaModal from '../../../WebhookManager/components/FullscreenTextareaModal';
import {
    useCreateSemanticCacheModal,
    CreateCacheModalHeader,
    CreateCacheNewForm
} from './CreateSemanticCacheModal/index';

const CreateSemanticCacheModal = ({
    isOpen,
    onClose,
    onSave,
    onLinkExisting,
    isSaving,
    defaultThreshold = 92,
    initialData = null,
    agentId = null,
    existingItems: propExistingItems = null
}) => {
    const {
        mode,
        setMode,
        userQuery,
        setUserQuery,
        approvedResponse,
        setApprovedResponse,
        alternateQueries,
        setAlternateQueries,
        similarityThreshold,
        setSimilarityThreshold,
        categoryTag,
        setCategoryTag,
        isFullscreenOpen,
        setIsFullscreenOpen,
        existingItems,
        selectedCacheId,
        setSelectedCacheId,
        loadingExisting,
        handleSubmit,
        handleLinkSubmit
    } = useCreateSemanticCacheModal({
        isOpen,
        initialData,
        agentId,
        existingItems: propExistingItems,
        onSave,
        onLinkExisting
    });

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <>
            <div
                className="modal-backdrop"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0, 0, 0, 0.78)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    transition: 'all 0.2s ease'
                }}
            >
                <div
                    className="modal-panel"
                    style={{
                        background: '#0f172a',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '16px',
                        padding: '26px',
                        maxWidth: '680px',
                        width: '92%',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                        color: '#f8fafc',
                        position: 'relative',
                        transition: 'all 0.25s ease'
                    }}
                >
                    <CreateCacheModalHeader
                        mode={mode}
                        setMode={setMode}
                        onClose={onClose}
                        isSaving={isSaving}
                    />

                    {mode === 'new' ? (
                        <CreateCacheNewForm
                            userQuery={userQuery}
                            setUserQuery={setUserQuery}
                            alternateQueries={alternateQueries}
                            setAlternateQueries={setAlternateQueries}
                            categoryTag={categoryTag}
                            setCategoryTag={setCategoryTag}
                            similarityThreshold={similarityThreshold}
                            setSimilarityThreshold={setSimilarityThreshold}
                            defaultThreshold={defaultThreshold}
                            approvedResponse={approvedResponse}
                            setApprovedResponse={setApprovedResponse}
                            agentId={agentId}
                            isSaving={isSaving}
                            onMaximizeResponse={() => setIsFullscreenOpen(true)}
                            onSubmit={handleSubmit}
                            onClose={onClose}
                        />
                    ) : (
                        <LinkExistingCacheSection
                            query={userQuery}
                            setQuery={setUserQuery}
                            existingItems={existingItems}
                            loadingExisting={loadingExisting}
                            selectedCacheId={selectedCacheId}
                            setSelectedCacheId={setSelectedCacheId}
                            onLinkSubmit={handleLinkSubmit}
                            onCancel={onClose}
                            isSaving={isSaving}
                        />
                    )}
                </div>
            </div>

            {/* Popup Gigante de Edição em Tela Cheia */}
            <FullscreenTextareaModal
                isOpen={isFullscreenOpen}
                title="🟒 Resposta Aprovada do Agente (Custo Zero)"
                subtitle="Edição expandida e confortável da resposta oficial que o agente responderá sem gastar tokens."
                value={approvedResponse}
                onChange={(newVal) => setApprovedResponse(newVal)}
                onClose={() => setIsFullscreenOpen(false)}
                placeholder="Digite a resposta oficial exata que o agente deve enviar ao cliente..."
                accentColor="#10b981"
            />
        </>,
        document.body
    );
};

export default CreateSemanticCacheModal;

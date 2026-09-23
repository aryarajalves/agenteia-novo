import React from 'react';
import MemorySection from './Common/MemorySection';
import AgentTabSection from './Common/AgentTabSection';
import { GeralTab, FollowupTab, SegurancaTab, ZapvoiceTab } from './EditWebhookTabs';
import ConfirmModal from './ConfirmModal';
import FullscreenTextareaModal from './FullscreenTextareaModal';
import { getSafeEditForm } from './EditWebhookModal/editWebhookHelpers';
import { useEditWebhookModal } from './EditWebhookModal/useEditWebhookModal';
import EditWebhookSidebar from './EditWebhookModal/EditWebhookSidebar';

const EditWebhookModal = ({
    editingWebhook,
    onClose,
    editTab,
    setEditTab,
    editForm,
    setEditForm,
    handleEdit,
    editSaving,
    editError,
    agents = [],
    handleGenerateDescription,
    syncingAgentId,
    editAllowedInput,
    setEditAllowedInput,
    editBlockedInput,
    setEditBlockedInput,
    editDeleteInput,
    setEditDeleteInput,
    chatwootGlobal,
    chatwootLabels = [],
    labelsLoading,
    fetchChatwootLabels,
    setConfirmRemoveFU,
    handleCreate
}) => {
    const safeEditForm = getSafeEditForm(editForm);

    const {
        isCreateMode,
        geralSubTab,
        setGeralSubTab,
        segurancaSubTab,
        setSegurancaSubTab,
        zapvoiceSubTab,
        setZapvoiceSubTab,
        showToken,
        setShowToken,
        activeFollowupStepTab,
        setActiveFollowupStepTab,
        smartTriggerTab,
        setSmartTriggerTab,
        uploadingMediaIndex,
        fullscreenModal,
        setFullscreenModal,
        zapvoiceTemplates,
        loadingTemplates,
        templateSearchTerm,
        setTemplateSearchTerm,
        uploadingHeaderMedia,
        handleUploadStepMedia,
        handleUploadHeaderMedia,
        fetchZapvoiceTemplates
    } = useEditWebhookModal({
        editingWebhook,
        editTab,
        safeEditForm,
        setEditForm,
        fetchChatwootLabels
    });

    const agentsList = agents || [];
    const labelsList = chatwootLabels || [];

    return (
        <div className="premium-modal-overlay">
            <div className="premium-modal-content">
                <div className="modal-header-premium">
                    <div className="header-info">
                        <span className="header-icon">{isCreateMode ? '✨' : '✏️'}</span>
                        <span className="header-title">{isCreateMode ? 'Nova Integração' : 'Editar Integração'}</span>
                    </div>
                </div>

                <div className="modal-body-wrapper">
                    <EditWebhookSidebar editTab={editTab} setEditTab={setEditTab} />

                    <div className="modal-main-content">
                        <form id="edit-webhook-form" onSubmit={isCreateMode ? handleCreate : handleEdit} className="modal-form-premium">
                            {editTab === 'geral' && (
                                <>
                                    <GeralTab
                                        safeEditForm={safeEditForm}
                                        setEditForm={setEditForm}
                                        geralSubTab={geralSubTab}
                                        setGeralSubTab={setGeralSubTab}
                                    />
                                    {geralSubTab === 'followup' && (
                                        <FollowupTab
                                            safeEditForm={safeEditForm}
                                            setEditForm={setEditForm}
                                            activeFollowupStepTab={activeFollowupStepTab}
                                            setActiveFollowupStepTab={setActiveFollowupStepTab}
                                            smartTriggerTab={smartTriggerTab}
                                            setSmartTriggerTab={setSmartTriggerTab}
                                            zapvoiceTemplates={zapvoiceTemplates}
                                            loadingTemplates={loadingTemplates}
                                            fetchZapvoiceTemplates={fetchZapvoiceTemplates}
                                            templateSearchTerm={templateSearchTerm}
                                            setTemplateSearchTerm={setTemplateSearchTerm}
                                            uploadingMediaIndex={uploadingMediaIndex}
                                            uploadingHeaderMedia={uploadingHeaderMedia}
                                            handleUploadStepMedia={handleUploadStepMedia}
                                            handleUploadHeaderMedia={handleUploadHeaderMedia}
                                            setFullscreenModal={setFullscreenModal}
                                            setConfirmRemoveFU={setConfirmRemoveFU}
                                            labelsList={labelsList}
                                        />
                                    )}
                                </>
                            )}

                            {editTab === 'agente' && (
                                <AgentTabSection
                                    safeEditForm={safeEditForm}
                                    setEditForm={setEditForm}
                                    agentsList={agentsList}
                                    handleGenerateDescription={handleGenerateDescription}
                                    syncingAgentId={syncingAgentId}
                                />
                            )}

                            {editTab === 'filtros' && (
                                <SegurancaTab
                                    safeEditForm={safeEditForm}
                                    setEditForm={setEditForm}
                                    segurancaSubTab={segurancaSubTab}
                                    setSegurancaSubTab={setSegurancaSubTab}
                                    editAllowedInput={editAllowedInput}
                                    setEditAllowedInput={setEditAllowedInput}
                                    editBlockedInput={editBlockedInput}
                                    setEditBlockedInput={setEditBlockedInput}
                                    editDeleteInput={editDeleteInput}
                                    setEditDeleteInput={setEditDeleteInput}
                                    labelsList={labelsList}
                                />
                            )}

                            {editTab === 'memoria' && (
                                <div className="tab-pane animate-fade-in">
                                    <MemorySection config={safeEditForm} setConfig={setEditForm} accentColor="#0ea5e9" />
                                </div>
                            )}

                            {editTab === 'zapvoice' && (
                                <ZapvoiceTab
                                    safeEditForm={safeEditForm}
                                    setEditForm={setEditForm}
                                    zapvoiceSubTab={zapvoiceSubTab}
                                    setZapvoiceSubTab={setZapvoiceSubTab}
                                    showToken={showToken}
                                    setShowToken={setShowToken}
                                    labelsList={labelsList}
                                    labelsLoading={labelsLoading}
                                    fetchChatwootLabels={fetchChatwootLabels}
                                />
                            )}

                            {editError && <p className="toast-premium error" style={{ position: 'static', marginTop: '1rem' }}>{editError}</p>}
                        </form>
                    </div>
                </div>

                <div className="modal-footer-premium">
                    <button type="button" onClick={onClose} className="btn-action-edit">Cancelar</button>
                    <button 
                        type="submit" 
                        form="edit-webhook-form" 
                        disabled={editSaving} 
                        className="btn-new-webhook" 
                        style={{ padding: '0.75rem 2rem' }}
                    >
                        {editSaving ? (isCreateMode ? 'Criando...' : 'Salvando...') : (isCreateMode ? 'Criar Integração' : 'Salvar Alterações')}
                    </button>
                </div>
            </div>
            <FullscreenTextareaModal
                isOpen={fullscreenModal.isOpen}
                title={fullscreenModal.title}
                subtitle={fullscreenModal.subtitle}
                value={fullscreenModal.value}
                onChange={(val) => {
                    setFullscreenModal(prev => ({ ...prev, value: val }));
                    if (fullscreenModal.onChange) {
                        fullscreenModal.onChange(val);
                    }
                }}
                onClose={() => setFullscreenModal({ isOpen: false })}
                variables={fullscreenModal.variables || []}
                placeholder={fullscreenModal.placeholder}
                accentColor={fullscreenModal.accentColor || '#6366f1'}
            />
        </div>
    );
};

export default EditWebhookModal;

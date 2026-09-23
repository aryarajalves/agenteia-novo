import React from 'react';
import AutomationPipelineModal from '../AutomationPipelineModal';
import FollowupPipelineModal from '../FollowupPipelineModal';
import LeadVariablesModal from '../LeadVariablesModal';
import ImportChatProgressModal from '../ImportChatProgressModal';
import ConfirmModal from '../../../ConfirmModal';

const LeadsSubModals = ({
    webhook,
    pipelineEvent,
    setPipelineEvent,
    followupLead,
    setFollowupLead,
    selectedLeadForVariables,
    setSelectedLeadForVariables,
    importProgress,
    onCloseImportProgress,
    onCancelImport,
    isCancellingImport,
    showConfirmImport,
    setShowConfirmImport,
    onImportChat
}) => {
    return (
        <>
            {/* Modal de Pipeline Integrado */}
            {pipelineEvent && (
                <AutomationPipelineModal
                    event={pipelineEvent}
                    webhookId={webhook?.id}
                    onClose={() => setPipelineEvent(null)}
                />
            )}

            {/* Modal de Pipeline de Follow-Up */}
            {followupLead && (
                <FollowupPipelineModal
                    lead={followupLead}
                    webhook={webhook}
                    onClose={() => setFollowupLead(null)}
                />
            )}

            {/* Modal de Variáveis do Contato */}
            {selectedLeadForVariables && (
                <LeadVariablesModal
                    isOpen={!!selectedLeadForVariables}
                    lead={selectedLeadForVariables}
                    webhookId={webhook?.id}
                    onClose={() => setSelectedLeadForVariables(null)}
                />
            )}

            {/* Modal de Progresso da Importação do ZapJords */}
            <ImportChatProgressModal
                isOpen={importProgress?.isOpen}
                onClose={onCloseImportProgress}
                onCancel={onCancelImport}
                isCancelling={isCancellingImport}
                progress={importProgress}
            />

            {/* Modal de Confirmação da Importação */}
            {showConfirmImport && (
                <ConfirmModal
                    isOpen={showConfirmImport}
                    icon="📥"
                    type="primary"
                    title="Importar do ZapJords"
                    message="Deseja sincronizar todas as conversas do ZapJords? Os contatos serão criados e suas mensagens salvas na memória sem custo de IA. O follow-up de novos contatos será pausado automaticamente."
                    confirmText="Sim, Importar"
                    cancelText="Cancelar"
                    onConfirm={() => {
                        setShowConfirmImport(false);
                        if (onImportChat) onImportChat();
                    }}
                    onCancel={() => setShowConfirmImport(false)}
                />
            )}
        </>
    );
};

export default LeadsSubModals;

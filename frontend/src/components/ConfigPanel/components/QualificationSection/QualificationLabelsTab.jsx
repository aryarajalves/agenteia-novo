import React from 'react';
import ChatwootLabelMultiSelect from '../Shared/ChatwootLabelMultiSelect';

export const QualificationLabelsTab = ({
    qualificationLabels,
    setQualificationLabels,
    availableLabels,
    isLoadingLabels
}) => {
    return (
        <div className="form-section" style={{ marginTop: 0, position: 'relative', zIndex: 50 }}>
            <span className="section-label">🏷️ Etiquetas do ZapVoice</span>
            <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                Selecione as etiquetas do ZapVoice que serão aplicadas automaticamente na conversa do contato quando a qualificação for concluída neste funil.
            </p>
            {isLoadingLabels ? (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span 
                        className="spinner" 
                        style={{ 
                            width: '14px', 
                            height: '14px', 
                            border: '2px solid rgba(255,255,255,0.2)', 
                            borderTopColor: '#6366f1', 
                            borderRadius: '50%', 
                            display: 'inline-block', 
                            animation: 'spin 1s linear infinite' 
                        }}
                    ></span>
                    Carregando etiquetas do ZapVoice...
                </div>
            ) : (
                <ChatwootLabelMultiSelect
                    selected={qualificationLabels || []}
                    options={availableLabels}
                    onChange={(newLabels) => setQualificationLabels(newLabels)}
                    accentColor="#10b981"
                />
            )}
        </div>
    );
};

export default QualificationLabelsTab;


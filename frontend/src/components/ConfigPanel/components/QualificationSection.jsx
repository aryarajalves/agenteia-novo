import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import ChatwootLabelMultiSelect from './Shared/ChatwootLabelMultiSelect';
import LeadScoringCriteriaModal from './Modals/LeadScoringCriteriaModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import QualificationStageModal from './Modals/QualificationStageModal';
import QualificationFinalActionSection from './QualificationFinalActionSection';
import QualificationFunnelsBar from './QualificationFunnelsBar';
import QualificationStagesTab from './QualificationStagesTab';

const QualificationSection = () => {
    const {
        id, isNew,
        qualificationQuestions, setQualificationQuestions,
        qualificationLabels, setQualificationLabels,
        qualificationCriteria, setQualificationCriteria,
        qualificationFinalAction, setQualificationFinalAction,
        qualificationFinalActionTrigger, setQualificationFinalActionTrigger,
        toolsList, selectedTools
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('stages');
    const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
    const [stageModal, setStageModal] = useState({ isOpen: false, stage: null, stageIndex: null });
    const [deleteQModal, setDeleteQModal] = useState({ isOpen: false, index: null, text: '' });
    const [availableLabels, setAvailableLabels] = useState([]);
    const [isLoadingLabels, setIsLoadingLabels] = useState(false);

    const isLeadQualificadoActive = toolsList.some(
        t => (selectedTools.includes(t.id) || selectedTools.includes(String(t.id)) || selectedTools.includes(Number(t.id))) && t.name === 'lead_qualificado'
    );

    useEffect(() => {
        const fetchLabels = async () => {
            if (isNew || !id) {
                setAvailableLabels([]);
                return;
            }
            setIsLoadingLabels(true);
            try {
                const res = await api.get(`/agents/${id}/chatwoot-labels`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLabels(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Erro ao buscar labels do Chatwoot:", err);
            } finally {
                setIsLoadingLabels(false);
            }
        };

        if (isLeadQualificadoActive) {
            fetchLabels();
        }
    }, [id, isNew, isLeadQualificadoActive]);

    if (!isLeadQualificadoActive) return null;

    const handleOpenStageModal = (index, stage) => {
        setStageModal({ isOpen: true, stage, stageIndex: index });
    };

    const handleOpenNewStage = () => {
        setStageModal({ isOpen: true, stage: null, stageIndex: null });
    };

    const handleCloseStageModal = () => {
        setStageModal({ isOpen: false, stage: null, stageIndex: null });
    };

    const handleSaveStageModal = (stageData, index) => {
        if (index !== null && index !== undefined) {
            const next = [...qualificationQuestions];
            next[index] = stageData;
            setQualificationQuestions(next);
        } else {
            setQualificationQuestions([...qualificationQuestions, stageData]);
        }
    };

    const handleRemoveStageClick = (index, text) => {
        setDeleteQModal({ isOpen: true, index, text });
    };

    const confirmDeleteStage = () => {
        if (deleteQModal.index !== null) {
            setQualificationQuestions(qualificationQuestions.filter((_, i) => i !== deleteQModal.index));
            setDeleteQModal({ isOpen: false, index: null, text: '' });
        }
    };

    const handleMoveStage = (index, direction) => {
        const next = [...qualificationQuestions];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setQualificationQuestions(next);
    };

    return (
        <div className="form-section" style={{ marginTop: '1.5rem' }}>
            <DeleteMessageModal 
                isOpen={deleteQModal.isOpen} 
                messageText={deleteQModal.text}
                descriptionText="Você tem certeza que deseja apagar esta etapa de qualificação?"
                onConfirm={confirmDeleteStage}
                onCancel={() => setDeleteQModal({ isOpen: false, index: null, text: '' })}
            />
            <LeadScoringCriteriaModal
                isOpen={isCriteriaModalOpen}
                onClose={() => setIsCriteriaModalOpen(false)}
                value={qualificationCriteria}
                onChange={(val) => setQualificationCriteria(val)}
            />
            <QualificationStageModal
                isOpen={stageModal.isOpen}
                stage={stageModal.stage}
                stageIndex={stageModal.stageIndex}
                totalStages={qualificationQuestions.length}
                onSave={handleSaveStageModal}
                onClose={handleCloseStageModal}
            />

            <QualificationFunnelsBar />

            {/* Sub-abas internas do Funil de Qualificação Ativo */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.25rem',
                marginTop: '1.25rem',
                flexWrap: 'wrap'
            }}>
                <button
                    type="button"
                    data-testid="subtab-funnel-stages"
                    onClick={() => setActiveSubTab('stages')}
                    style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'stages' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                        color: activeSubTab === 'stages' ? '#a5b4fc' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'stages' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                    }}
                >
                    <span>🎯 Etapas de Sondagem</span>
                    <span style={{
                        background: activeSubTab === 'stages' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: activeSubTab === 'stages' ? '#fff' : '#cbd5e1'
                    }}>
                        {qualificationQuestions.length}
                    </span>
                </button>

                <button
                    type="button"
                    data-testid="subtab-funnel-labels"
                    onClick={() => setActiveSubTab('labels')}
                    style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'labels' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: activeSubTab === 'labels' ? '#34d399' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'labels' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                    }}
                >
                    <span>🏷️ Etiquetas</span>
                    <span style={{
                        background: activeSubTab === 'labels' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: activeSubTab === 'labels' ? '#fff' : '#cbd5e1'
                    }}>
                        {Array.isArray(qualificationLabels) ? qualificationLabels.length : (qualificationLabels ? 1 : 0)}
                    </span>
                </button>

                <button
                    type="button"
                    data-testid="subtab-funnel-final-action"
                    onClick={() => setActiveSubTab('final_action')}
                    style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'final_action' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                        color: activeSubTab === 'final_action' ? '#f472b6' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'final_action' ? '0 4px 12px rgba(236, 72, 153, 0.2)' : 'none'
                    }}
                >
                    <span>🚀 Ação Final / Fechamento</span>
                    {qualificationFinalAction && (
                        <span style={{
                            background: 'rgba(236, 72, 153, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            color: '#fbcfe8'
                        }}>
                            Ativa
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    data-testid="subtab-funnel-scoring"
                    onClick={() => setActiveSubTab('scoring')}
                    style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'scoring' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: activeSubTab === 'scoring' ? '#fbbf24' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'scoring' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
                    }}
                >
                    <span>🔥 Lead Scoring & Critérios</span>
                    {qualificationCriteria && (
                        <span style={{
                            background: 'rgba(245, 158, 11, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            color: '#fef3c7'
                        }}>
                            Definido
                        </span>
                    )}
                </button>
            </div>

            {/* Conteúdo da Aba 1: Etapas de Sondagem */}
            {activeSubTab === 'stages' && (
                <QualificationStagesTab
                    qualificationQuestions={qualificationQuestions}
                    onOpenNewStage={handleOpenNewStage}
                    onOpenStageModal={handleOpenStageModal}
                    onMoveStage={handleMoveStage}
                    onRemoveStageClick={handleRemoveStageClick}
                />
            )}

            {/* Conteúdo da Aba 2: Etiquetas do ZapVoice */}
            {activeSubTab === 'labels' && (
                <div className="form-section" style={{ marginTop: 0, position: 'relative', zIndex: 50 }}>
                    <span className="section-label">🏷️ Etiquetas do ZapVoice</span>
                    <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                        Selecione as etiquetas do ZapVoice que serão aplicadas automaticamente na conversa do contato quando a qualificação for concluída neste funil.
                    </p>
                    {isLoadingLabels ? (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
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
            )}

            {/* Conteúdo da Aba 3: Pergunta / Ação Final Pós-Qualificação */}
            {activeSubTab === 'final_action' && (
                <div style={{ position: 'relative', zIndex: 20 }}>
                    <QualificationFinalActionSection
                        value={qualificationFinalAction}
                        onChange={setQualificationFinalAction}
                        triggerValue={qualificationFinalActionTrigger}
                        onTriggerChange={setQualificationFinalActionTrigger}
                    />
                </div>
            )}

            {/* Conteúdo da Aba 4: Lead Scoring & Critérios */}
            {activeSubTab === 'scoring' && (
                <div className="form-section" style={{ marginTop: 0, position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span className="section-label" style={{ margin: 0 }}>🔥 Diretrizes e Critérios do Lead Scoring</span>
                        <button 
                            type="button" 
                            onClick={() => setIsCriteriaModalOpen(true)} 
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#cbd5e1',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            🔍 Maximizar
                        </button>
                    </div>
                    <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                        Defina as regras de negócio e critérios que a IA utilizará para pontuar o lead (de 0 a 100) e classificá-lo em Quente 🔥, Morno ⚡ ou Frio ❄️ com base nas respostas dadas neste funil.
                    </p>
                    <textarea
                        placeholder="Ex: Avalie o lead com base nos seguintes critérios:
- Se ele tem orçamento maior que R$ 5.000 para investir em mentoria, atribua +50 pontos.
- Se ele quer começar imediatamente, atribua +30 pontos.
- Se ele já tentou outras soluções sem sucesso, atribua +20 pontos.
Classifique como Quente 🔥 se a pontuação for >= 70, Morno ⚡ se for de 40 a 69, e Frio ❄️ se for < 40."
                        value={qualificationCriteria || ''}
                        onChange={(e) => setQualificationCriteria(e.target.value)}
                        style={{ minHeight: '180px' }}
                    />
                </div>
            )}
        </div>
    );
};

export default QualificationSection;

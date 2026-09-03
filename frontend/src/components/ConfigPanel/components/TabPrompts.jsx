import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import PromptEditor from '../../PromptEditor/index';
import TemporalGuideModal from './Modals/TemporalGuideModal';
import TemporalConfigGuideModal from './Modals/TemporalConfigGuideModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import QualificationSection from './QualificationSection';
import TemporalSection from './TemporalSection';

const TabPrompts = () => {
    const {
        id, isNew, systemPrompt, setSystemPrompt,
        dynamicPrompt, setDynamicPrompt,
        preRouterPrompt, setPreRouterPrompt,
        routerEnabled, routerComplexModel, selectedModel,
        initialMessage, setInitialMessage,
        initialQuestionMessage, setInitialQuestionMessage,
        initialIgnoreMessage, setInitialIgnoreMessage,
        qualificationQuestions,
        dateAwareness, setDateAwareness,
        dateAwarenessPastDays, setDateAwarenessPastDays,
        dateAwarenessFutureDays, setDateAwarenessFutureDays,
        simulatedTime, setSimulatedTime,
        toolsList, selectedTools,
        greetingMode, setGreetingMode,
        questionMode, setQuestionMode,
        adMode, setAdMode
    } = useConfig();

    const [activePromptSubTab, setActivePromptSubTab] = useState('prompts'); // 'prompts' | 'qualification' | 'temporal'
    const [showTemporalGuide, setShowTemporalGuide] = useState(false);
    const [showTemporalConfigGuide, setShowTemporalConfigGuide] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, index: null, text: '' });

    useEffect(() => {
        if (showTemporalGuide || showTemporalConfigGuide || deleteModal.isOpen) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [showTemporalGuide, showTemporalConfigGuide, deleteModal.isOpen]);

    const handleAddIgnoreMsg = () => {
        const input = document.getElementById('new-ignore-msg');
        const val = input ? input.value.trim() : '';
        if (val) {
            setInitialIgnoreMessage([...initialIgnoreMessage, val]);
            input.value = '';
        }
    };

    const confirmDelete = () => {
        if (deleteModal.index !== null) {
            setInitialIgnoreMessage(initialIgnoreMessage.filter((_, i) => i !== deleteModal.index));
            setDeleteModal({ isOpen: false, index: null, text: '' });
        }
    };

    return (
        <div className="fade-in">
            <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span className="section-label" style={{ margin: 0 }}>Editor Prompt & Regras</span>
                    <button type="button" onClick={() => setShowTemporalGuide(true)} className="guide-btn">
                        <span>📖</span><span>Guia do Prompt</span>
                    </button>
                </div>

                <TemporalGuideModal isOpen={showTemporalGuide} onClose={() => setShowTemporalGuide(false)} />
                <TemporalConfigGuideModal isOpen={showTemporalConfigGuide} onClose={() => setShowTemporalConfigGuide(false)} />
                <DeleteMessageModal 
                    isOpen={deleteModal.isOpen} 
                    messageText={deleteModal.text}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, index: null, text: '' })}
                />

                {/* Navegação por Sub-Abas do Editor de Prompt */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <button
                        type="button"
                        data-testid="subtab-prompts-editor"
                        onClick={() => setActivePromptSubTab('prompts')}
                        style={{
                            flex: 1,
                            minWidth: '180px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activePromptSubTab === 'prompts' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                            color: activePromptSubTab === 'prompts' ? '#c7d2fe' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            boxShadow: activePromptSubTab === 'prompts' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                        }}
                    >
                        <span>📝 Instruções do Sistema</span>
                    </button>

                    <button
                        type="button"
                        data-testid="subtab-prompts-qualification"
                        onClick={() => setActivePromptSubTab('qualification')}
                        style={{
                            flex: 1,
                            minWidth: '180px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activePromptSubTab === 'qualification' ? 'rgba(236, 72, 153, 0.25)' : 'transparent',
                            color: activePromptSubTab === 'qualification' ? '#fbcfe8' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            boxShadow: activePromptSubTab === 'qualification' ? '0 4px 12px rgba(236, 72, 153, 0.2)' : 'none'
                        }}
                    >
                        <span>🎯 Funil de Qualificação</span>
                        {qualificationQuestions && qualificationQuestions.length > 0 && (
                            <span style={{
                                background: activePromptSubTab === 'qualification' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                padding: '1px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                color: '#fff',
                                fontWeight: 700
                            }}>
                                {qualificationQuestions.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        data-testid="subtab-prompts-temporal"
                        onClick={() => setActivePromptSubTab('temporal')}
                        style={{
                            flex: 1,
                            minWidth: '180px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activePromptSubTab === 'temporal' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                            color: activePromptSubTab === 'temporal' ? '#bae6fd' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            boxShadow: activePromptSubTab === 'temporal' ? '0 4px 12px rgba(56, 189, 248, 0.2)' : 'none'
                        }}
                    >
                        <span>👋 Saudação & Consciência Temporal</span>
                        {dateAwareness && (
                            <span style={{
                                background: activePromptSubTab === 'temporal' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                padding: '1px 8px',
                                borderRadius: '10px',
                                fontSize: '0.72rem',
                                color: '#fff',
                                fontWeight: 700
                            }}>
                                🕒 Ativo
                            </span>
                        )}
                    </button>
                </div>

                {/* Sub-Aba 1: Instruções do Sistema (Prompt Principal) */}
                {activePromptSubTab === 'prompts' && (
                    <div className="fade-in">
                        <PromptEditor
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            dynamicValue={dynamicPrompt}
                            onChangeDynamic={(e) => setDynamicPrompt(e.target.value)}
                            preRouterValue={preRouterPrompt}
                            onChangePreRouter={(e) => setPreRouterPrompt(e.target.value)}
                            agentId={id}
                            mainModel={routerEnabled ? routerComplexModel : selectedModel}
                            initialMessage={initialMessage}
                            initialQuestionMessage={initialQuestionMessage}
                            onChangeInitialMessage={(val) => setInitialMessage(val)}
                            availableTools={toolsList
                                .filter(t => selectedTools.includes(t.id))
                                .map(t => t.name)
                            }
                        />
                    </div>
                )}

                {/* Sub-Aba 2: Funil de Qualificação & Fechamento */}
                {activePromptSubTab === 'qualification' && (
                    <div className="fade-in">
                        <QualificationSection />
                    </div>
                )}

                {/* Sub-Aba 3: Saudação & Consciência Temporal */}
                {activePromptSubTab === 'temporal' && (
                    <div className="fade-in">
                        <TemporalSection />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabPrompts;

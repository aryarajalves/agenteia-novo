import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import ChatwootLabelMultiSelect from './Shared/ChatwootLabelMultiSelect';
import LeadScoringCriteriaModal from './Modals/LeadScoringCriteriaModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import QualificationFinalActionSection from './QualificationFinalActionSection';

const QualificationSection = () => {
    const {
        id, isNew,
        qualificationQuestions, setQualificationQuestions,
        qualificationLabels, setQualificationLabels,
        qualificationCriteria, setQualificationCriteria,
        qualificationFinalAction, setQualificationFinalAction,
        toolsList, selectedTools
    } = useConfig();

    const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingPrompt, setEditingPrompt] = useState('');
    const [editingCriteria, setEditingCriteria] = useState('');
    
    // Estados para o formulário de nova etapa
    const [newTitle, setNewTitle] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [newCriteria, setNewCriteria] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

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

    const handleAddStage = () => {
        const titleVal = newTitle.trim();
        const promptVal = newPrompt.trim();
        if (!titleVal && !promptVal) return;

        const newStage = {
            title: titleVal || `Etapa ${qualificationQuestions.length + 1}`,
            prompt: promptVal || titleVal,
            criteria: newCriteria.trim(),
            // compatibilidade retroativa
            text: titleVal || promptVal,
            instruction: promptVal
        };

        setQualificationQuestions([...qualificationQuestions, newStage]);
        setNewTitle('');
        setNewPrompt('');
        setNewCriteria('');
        setShowAddForm(false);
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

    const handleStartEdit = (index, q) => {
        setEditingIndex(index);
        if (typeof q === 'string') {
            setEditingTitle(q);
            setEditingPrompt(q);
            setEditingCriteria('');
        } else {
            setEditingTitle(q.title || q.text || '');
            setEditingPrompt(q.prompt || q.prompt_instruction || q.instruction || q.text || '');
            setEditingCriteria(q.criteria || q.completion_criteria || '');
        }
    };

    const handleSaveEdit = (index) => {
        if (!editingTitle.trim() && !editingPrompt.trim()) return;
        const next = [...qualificationQuestions];
        next[index] = { 
            title: editingTitle.trim() || `Etapa ${index + 1}`,
            prompt: editingPrompt.trim() || editingTitle.trim(),
            criteria: editingCriteria.trim(),
            // compatibilidade
            text: editingTitle.trim() || editingPrompt.trim(),
            instruction: editingPrompt.trim()
        };
        setQualificationQuestions(next);
        setEditingIndex(null);
        setEditingTitle('');
        setEditingPrompt('');
        setEditingCriteria('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditingTitle('');
        setEditingPrompt('');
        setEditingCriteria('');
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="section-label" style={{ margin: 0 }}>🎯 Funil de Qualificação & Sondagem Estratégica</span>
                <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{
                        background: showAddForm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.2)',
                        border: showAddForm ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.4)',
                        color: showAddForm ? '#fca5a5' : '#a5b4fc',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {showAddForm ? '✕ Fechar Formulário' : '➕ Nova Etapa / Prompt'}
                </button>
            </div>
            
            <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                A IA conduzirá o lead por cada objetivo de forma natural e consultiva. Você não precisa escrever perguntas fixas: forneça uma <strong>diretriz / prompt</strong> e a IA formulará a pergunta ideal adaptada à conversa.
            </p>

            {/* Formulário de Adicionar Nova Etapa */}
            {showAddForm && (
                <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#c7d2fe' }}>
                        ✨ Cadastrar Etapa de Sondagem do Lead
                    </span>
                    
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                            🏷️ Nome da Etapa (Ex: Experiência Prévia, Aparelho, Orçamento):
                        </label>
                        <input
                            id="new-stage-title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Ex: Experiência do Lead"
                            style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff', fontSize: '0.85rem' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                            🤖 Prompt / Diretriz da Pergunta (O que a IA deve descobrir e como perguntar):
                        </label>
                        <textarea
                            id="new-stage-prompt"
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            placeholder="Ex: Descubra se ela já atua com estética ou se está começando do absoluto zero, mantendo um tom encorajador e acolhedor."
                            style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff', fontSize: '0.85rem', minHeight: '60px' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                            ✅ Critério de Conclusão (Opcional - Quando considerar esta etapa respondida):
                        </label>
                        <input
                            id="new-stage-criteria"
                            value={newCriteria}
                            onChange={(e) => setNewCriteria(e.target.value)}
                            placeholder="Ex: Considerar concluído quando o lead disser se já atende clientes ou se é iniciante."
                            style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff', fontSize: '0.85rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button type="button" onClick={() => setShowAddForm(false)} className="delete-btn" style={{ padding: '0.4rem 0.8rem' }}>
                            Cancelar
                        </button>
                        <button type="button" onClick={handleAddStage} className="add-btn" style={{ padding: '0.4rem 1rem' }}>
                            <span>💾</span> Salvar Etapa no Funil
                        </button>
                    </div>
                </div>
            )}

            {/* Listagem de Etapas do Funil */}
            <div className="ignore-msg-list" style={{ marginTop: '0.5rem' }}>
                {qualificationQuestions.length === 0 ? (
                    <div className="empty-state">
                        Nenhuma etapa cadastrada. Clique em "➕ Nova Etapa / Prompt" para criar o funil de sondagem.
                    </div>
                ) : (
                    qualificationQuestions.map((q, idx) => {
                        const title = typeof q === 'string' ? q : (q.title || q.text || `Etapa ${idx + 1}`);
                        const prompt = typeof q === 'string' ? '' : (q.prompt || q.prompt_instruction || q.instruction || '');
                        const criteria = typeof q === 'string' ? '' : (q.criteria || q.completion_criteria || '');
                        const isEditing = editingIndex === idx;

                        return (
                            <div key={idx} className="ignore-msg-item" style={{ 
                                flexDirection: 'column', 
                                alignItems: 'stretch', 
                                gap: '0.5rem',
                                padding: '0.85rem',
                                background: isEditing ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                                border: isEditing ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
                                    <span style={{
                                        minWidth: '26px', height: '26px', borderRadius: '50%',
                                        background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                                    }}>{idx + 1}</span>
                                    
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            style={{ 
                                                flex: 1, 
                                                background: '#0f172a', 
                                                border: '1px solid rgba(255,255,255,0.15)', 
                                                borderRadius: '6px', 
                                                padding: '0.4rem 0.6rem', 
                                                color: '#fff', 
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold'
                                            }}
                                            placeholder="Nome da Etapa"
                                        />
                                    ) : (
                                        <div 
                                            className="msg-text" 
                                            style={{ flex: 1, cursor: 'pointer', userSelect: 'none', fontWeight: '600', color: '#e2e8f0' }}
                                            onClick={() => handleStartEdit(idx, q)}
                                            title="Clique para editar etapa e prompt"
                                        >
                                            🎯 {title}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        {isEditing ? (
                                            <>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleSaveEdit(idx)} 
                                                    className="delete-btn" 
                                                    style={{ color: '#10b981', fontSize: '1rem', fontWeight: 'bold' }}
                                                    title="Salvar alteração"
                                                >
                                                    ✓
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelEdit} 
                                                    className="delete-btn" 
                                                    style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 'bold' }}
                                                    title="Cancelar"
                                                >
                                                    ✗
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" onClick={() => handleMoveStage(idx, -1)} disabled={idx === 0}
                                                    className="delete-btn" style={{ opacity: idx === 0 ? 0.3 : 1, fontSize: '0.75rem' }}>▲</button>
                                                <button type="button" onClick={() => handleMoveStage(idx, 1)} disabled={idx === qualificationQuestions.length - 1}
                                                    className="delete-btn" style={{ opacity: idx === qualificationQuestions.length - 1 ? 0.3 : 1, fontSize: '0.75rem' }}>▼</button>
                                                <button type="button" onClick={() => handleRemoveStageClick(idx, title)} className="delete-btn">🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Edição inline dos campos de Prompt e Critério */}
                                {isEditing ? (
                                    <div style={{ 
                                        marginTop: '0.5rem', 
                                        paddingLeft: '2rem', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '0.5rem',
                                        animation: 'fadeIn 0.2s ease'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: '600', display: 'block', marginBottom: '0.2rem' }}>
                                                🤖 Prompt / Diretriz da Pergunta para a IA:
                                            </label>
                                            <textarea
                                                value={editingPrompt}
                                                onChange={(e) => setEditingPrompt(e.target.value)}
                                                placeholder="Descreva o que a IA deve perguntar e como deve se portar..."
                                                style={{
                                                    width: '100%',
                                                    background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '6px',
                                                    padding: '0.4rem 0.6rem',
                                                    color: '#cbd5e1',
                                                    fontSize: '0.78rem',
                                                    minHeight: '55px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '0.2rem' }}>
                                                ✅ Critério de Conclusão (Opcional):
                                            </label>
                                            <input
                                                type="text"
                                                value={editingCriteria}
                                                onChange={(e) => setEditingCriteria(e.target.value)}
                                                placeholder="Quando considerar esta etapa respondida..."
                                                style={{
                                                    width: '100%',
                                                    background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '6px',
                                                    padding: '0.4rem 0.6rem',
                                                    color: '#cbd5e1',
                                                    fontSize: '0.78rem'
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ paddingLeft: '2.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '-0.2rem' }}>
                                        {prompt && (
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                <span style={{ color: '#818cf8', fontWeight: 'bold' }}>🤖 Prompt:</span>
                                                <span style={{ color: '#cbd5e1' }}>{prompt}</span>
                                            </div>
                                        )}
                                        {criteria && (
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>↳ Critério:</span> {criteria}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="form-section" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', position: 'relative', zIndex: 50 }}>
                <span className="section-label">🏷️ Etiquetas do ZapVoice</span>
                <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                    Selecione as etiquetas do ZapVoice que serão aplicadas automaticamente na conversa do contato quando a qualificação for concluída.
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
                        accentColor="#6366f1"
                    />
                )}
            </div>

            {/* Pergunta / Ação Final Pós-Qualificação */}
            <div style={{ position: 'relative', zIndex: 20 }}>
                <QualificationFinalActionSection
                    value={qualificationFinalAction}
                    onChange={setQualificationFinalAction}
                />
            </div>

            <div className="form-section" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', position: 'relative', zIndex: 10 }}>
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
                    Defina as regras de negócio e critérios que a IA utilizará para pontuar o lead (de 0 a 13) e classificá-lo em Quente 🔥, Morno ⚡ ou Frio ❄️ com base nas respostas dadas.
                </p>
                <textarea
                    placeholder="Ex: Avalie o lead com base nos seguintes critérios:
- Se ele tem orçamento maior que R$ 5.000 para investir em mentoria, atribua +5 pontos.
- Se ele quer começar imediatamente, atribua +4 pontos.
- Se ele já tentou outras soluções sem sucesso, atribua +4 pontos.
Classifique como Quente 🔥 se a pontuação for >= 9, Morno ⚡ se for de 5 a 8, e Frio ❄️ se for < 5."
                    value={qualificationCriteria || ''}
                    onChange={(e) => setQualificationCriteria(e.target.value)}
                    style={{ minHeight: '180px' }}
                />
            </div>
        </div>
    );
};

export default QualificationSection;


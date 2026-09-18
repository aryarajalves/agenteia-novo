import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const QualificationStageModal = ({
    isOpen,
    stage,
    stageIndex = null,
    totalStages = 0,
    onSave,
    onClose
}) => {
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [criteria, setCriteria] = useState('');

    const isNew = stageIndex === null;

    useEffect(() => {
        if (isOpen) {
            if (stage) {
                if (typeof stage === 'string') {
                    setTitle(stage);
                    setPrompt(stage);
                    setCriteria('');
                } else {
                    setTitle(stage.title || stage.text || '');
                    setPrompt(stage.prompt || stage.prompt_instruction || stage.instruction || stage.text || '');
                    setCriteria(stage.criteria || stage.completion_criteria || '');
                }
            } else {
                setTitle('');
                setPrompt('');
                setCriteria('');
            }
        }
    }, [isOpen, stage]);

    if (!isOpen) return null;

    const charCount = prompt ? prompt.length : 0;
    const wordCount = prompt?.trim() ? prompt.trim().split(/\s+/).length : 0;

    const handleSave = () => {
        const titleVal = title.trim();
        const promptVal = prompt.trim();
        if (!titleVal && !promptVal) return;

        const stageData = {
            title: titleVal || (isNew ? `Etapa ${totalStages + 1}` : `Etapa ${stageIndex + 1}`),
            prompt: promptVal || titleVal,
            criteria: criteria.trim(),
            text: titleVal || promptVal,
            instruction: promptVal || titleVal
        };

        if (onSave) {
            onSave(stageData, stageIndex);
        }
        if (onClose) {
            onClose();
        }
    };

    return ReactDOM.createPortal(
        <div
            className="modal-backdrop"
            data-testid="qualification-stage-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                padding: '1rem'
            }}
        >
            <div
                className="modal-panel"
                data-testid="qualification-stage-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '16px',
                    width: '90vw',
                    maxWidth: '850px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                    color: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease'
                }}
            >
                {/* Barra superior de acento gradiente */}
                <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7, #38bdf8)' }} />

                {/* Cabeçalho */}
                <div style={{
                    padding: '1.25rem 1.75rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.18)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem'
                        }}>
                            🎯
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isNew ? 'Nova Etapa do Funil de Qualificação' : `Etapa ${stageIndex + 1}: ${title || 'Configuração'}`}
                                {!isNew && (
                                    <span style={{
                                        fontSize: '0.72rem',
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        border: '1px solid rgba(99, 102, 241, 0.4)',
                                        color: '#c7d2fe',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontWeight: 600
                                    }}>
                                        {stageIndex + 1} de {totalStages}
                                    </span>
                                )}
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                                Defina o objetivo, a diretriz para a IA formular a pergunta e os critérios de conclusão desta etapa.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Corpo do Modal */}
                <div style={{
                    padding: '1.5rem 1.75rem',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    flex: 1
                }}>
                    {/* Campo 1: Nome da Etapa */}
                    <div>
                        <label style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#e2e8f0',
                            display: 'block',
                            marginBottom: '0.4rem'
                        }}>
                            🏷️ Nome / Objetivo da Etapa:
                        </label>
                        <input
                            id="stage-modal-title"
                            data-testid="stage-modal-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Qual é o seu nome? ou Experiência do Lead"
                            style={{
                                width: '100%',
                                background: '#090d16',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                padding: '0.65rem 0.9rem',
                                color: '#fff',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                        />
                    </div>

                    {/* Campo 2: Prompt / Diretriz da Pergunta */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={{
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: '#a5b4fc',
                                display: 'block'
                            }}>
                                🤖 Prompt & Diretriz da Pergunta (O que a IA deve descobrir e como perguntar):
                            </label>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                A IA adaptará a fala naturalmente
                            </span>
                        </div>
                        <textarea
                            id="stage-modal-prompt"
                            data-testid="stage-modal-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Descreva o que a IA deve descobrir, o tom da mensagem e quais informações ela precisa extrair do lead..."
                            style={{
                                width: '100%',
                                minHeight: '160px',
                                background: '#090d16',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                padding: '0.8rem 0.9rem',
                                color: '#cbd5e1',
                                fontSize: '0.88rem',
                                lineHeight: '1.6',
                                outline: 'none',
                                resize: 'vertical',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                            <span>Caracteres: <strong style={{ color: '#cbd5e1' }}>{charCount}</strong></span>
                            <span>Palavras: <strong style={{ color: '#cbd5e1' }}>{wordCount}</strong></span>
                        </div>
                    </div>

                    {/* Campo 3: Critério de Conclusão */}
                    <div>
                        <label style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#94a3b8',
                            display: 'block',
                            marginBottom: '0.4rem'
                        }}>
                            ✅ Critério de Conclusão (Opcional - Quando considerar esta etapa respondida):
                        </label>
                        <input
                            id="stage-modal-criteria"
                            data-testid="stage-modal-criteria"
                            type="text"
                            value={criteria}
                            onChange={(e) => setCriteria(e.target.value)}
                            placeholder="Ex: Considerar concluído quando o lead disser se já atende clientes ou se é iniciante."
                            style={{
                                width: '100%',
                                background: '#090d16',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                padding: '0.65rem 0.9rem',
                                color: '#cbd5e1',
                                fontSize: '0.85rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                        />
                    </div>
                </div>

                {/* Rodapé: Padrão com 1 botão Cancelar e 1 botão de Ação Principal */}
                <div style={{
                    padding: '1.25rem 1.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <button
                        type="button"
                        data-testid="stage-modal-cancel-btn"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#94a3b8',
                            padding: '0.65rem 1.3rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.06)'; e.target.style.color = '#94a3b8'; }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        data-testid="stage-modal-save-btn"
                        onClick={handleSave}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            color: '#fff',
                            padding: '0.65rem 1.6rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        {isNew ? '💾 Adicionar Etapa no Funil' : '💾 Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QualificationStageModal;

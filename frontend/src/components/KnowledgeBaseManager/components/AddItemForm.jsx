import React, { useState } from 'react';
import { useKB } from '../KBContext';
import ExpandableField from '../../ExpandableField';
import QuestionVariationsInput from './QuestionVariationsInput';
import MetadataBadgesInput from './MetadataBadgesInput';
import { useKBOperations } from '../hooks/useKBOperations';

const AddItemForm = () => {
    const { kbLabels, kbType } = useKB();
    const { handleAddItem } = useKBOperations();
    const [newPair, setNewPair] = useState({ 
        question: '', 
        answer: '', 
        metadata_val: '', 
        category: 'Geral',
        question_variations: []
    });
    const [isSaving, setIsSaving] = useState(false);

    if (kbType === 'product') return null;

    const onAdd = async () => {
        setIsSaving(true);
        const success = await handleAddItem(newPair);
        setIsSaving(false);
        if (success) {
            setNewPair({ 
                question: '', 
                answer: '', 
                metadata_val: '', 
                category: 'Geral',
                question_variations: []
            });
        }
    };

    return (
        <div className="kb-add-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '8px', height: '24px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
                <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800 }}>Novo Conhecimento</h4>
            </div>

            <div className="form-row-kb">
                <div className="form-group flex-2">
                    <ExpandableField
                        label={kbLabels.question}
                        placeholder={`Ex: ${kbLabels.question === 'Pergunta' ? 'Qual o horário de funcionamento?' : 'Digite aqui...'}`}
                        value={newPair.question}
                        onChange={(e) => setNewPair({ ...newPair, question: e.target.value })}
                    />
                </div>
                <div className="form-group flex-2">
                    <MetadataBadgesInput
                        label={kbLabels.metadata}
                        placeholder={`Ex: ${kbLabels.metadata === 'Metadado' ? 'PAINEL INICIAL | Chat (Enter)' : 'Digite aqui...'}`}
                        value={newPair.metadata_val}
                        onChange={(val) => setNewPair({ ...newPair, metadata_val: val })}
                        disabled={isSaving}
                    />
                </div>
                <div className="form-group flex-1">
                    <label>Categoria</label>
                    <input
                        type="text"
                        value={newPair.category}
                        onChange={e => setNewPair({ ...newPair, category: e.target.value })}
                        placeholder="Geral, Preços, etc."
                    />
                </div>
            </div>

            <QuestionVariationsInput
                variations={newPair.question_variations}
                onChange={(vars) => setNewPair(prev => ({ ...prev, question_variations: vars }))}
                disabled={isSaving}
            />

            <div className="form-group">
                <ExpandableField
                    label={kbLabels.answer}
                    type="textarea"
                    placeholder={`Ex: ${kbLabels.answer === 'Resposta' ? 'O horário é...' : 'Digite o conteúdo...'}`}
                    value={newPair.answer}
                    onChange={(e) => setNewPair({ ...newPair, answer: e.target.value })}
                    style={{ minHeight: '120px' }}
                />
            </div>

            <button
                onClick={onAdd}
                disabled={isSaving}
                className="create-agent-btn"
                style={{ width: '100%', border: 'none', padding: '1.2rem', fontSize: '1.05rem' }}
            >
                {isSaving ? 'Salvando...' : '✓ Adicionar à Base'}
            </button>
        </div>
    );
};

export default AddItemForm;

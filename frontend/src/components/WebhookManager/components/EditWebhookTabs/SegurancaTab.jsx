import React from 'react';
import { AllowedContactsSection, BlockedMessagesSection } from '../Common/ContactSections';
import DeleteKeywordsSection from '../Common/DeleteKeywordsSection';
import { normalizeContact } from '../../utils/helpers';

const SegurancaTab = ({
    safeEditForm,
    setEditForm,
    segurancaSubTab,
    setSegurancaSubTab,
    editAllowedInput,
    setEditAllowedInput,
    editBlockedInput,
    setEditBlockedInput,
    editDeleteInput,
    setEditDeleteInput,
    labelsList = []
}) => {
    return (
        <div className="tab-pane animate-fade-in">
            {/* Sub-Abas Superiores da Aba Segurança */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                <button
                    type="button"
                    onClick={() => setSegurancaSubTab('permitidos')}
                    style={{
                        background: segurancaSubTab === 'permitidos' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: segurancaSubTab === 'permitidos' ? '#4ade80' : '#94a3b8',
                        border: segurancaSubTab === 'permitidos' ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    ✅ Contatos Permitidos
                </button>
                <button
                    type="button"
                    onClick={() => setSegurancaSubTab('bloqueadas')}
                    style={{
                        background: segurancaSubTab === 'bloqueadas' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: segurancaSubTab === 'bloqueadas' ? '#f87171' : '#94a3b8',
                        border: segurancaSubTab === 'bloqueadas' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    🚫 Mensagens Bloqueadas
                </button>
                <button
                    type="button"
                    onClick={() => setSegurancaSubTab('exclusao')}
                    style={{
                        background: segurancaSubTab === 'exclusao' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: segurancaSubTab === 'exclusao' ? '#fbbf24' : '#94a3b8',
                        border: segurancaSubTab === 'exclusao' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    🗑️ Exclusão de Contatos
                </button>
            </div>

            {/* SUB-ABA 1: CONTATOS PERMITIDOS */}
            {segurancaSubTab === 'permitidos' && (
                <AllowedContactsSection
                    contacts={safeEditForm.allowed_contacts || []}
                    inputValue={editAllowedInput || ''}
                    onInputChange={setEditAllowedInput}
                    onAdd={() => {
                        const v = normalizeContact(editAllowedInput);
                        if (v && !(safeEditForm.allowed_contacts || []).includes(v)) {
                            setEditForm({ ...safeEditForm, allowed_contacts: [...(safeEditForm.allowed_contacts || []), v] });
                        }
                        setEditAllowedInput('');
                    }}
                    onRemove={(c) => setEditForm({ ...safeEditForm, allowed_contacts: (safeEditForm.allowed_contacts || []).filter(x => x !== c) })}
                />
            )}

            {/* SUB-ABA 2: MENSAGENS BLOQUEADAS */}
            {segurancaSubTab === 'bloqueadas' && (
                <BlockedMessagesSection
                    messages={safeEditForm.blocked_messages || []}
                    inputValue={editBlockedInput || ''}
                    onInputChange={setEditBlockedInput}
                    onAdd={() => {
                        const v = (editBlockedInput || '').trim();
                        if (v && !(safeEditForm.blocked_messages || []).includes(v)) {
                            setEditForm({ ...safeEditForm, blocked_messages: [...(safeEditForm.blocked_messages || []), v] });
                        }
                        setEditBlockedInput('');
                    }}
                    onRemove={(msg) => setEditForm({ ...safeEditForm, blocked_messages: (safeEditForm.blocked_messages || []).filter(m => m !== msg) })}
                />
            )}

            {/* SUB-ABA 3: EXCLUSÃO DE CONTATOS */}
            {segurancaSubTab === 'exclusao' && (
                <DeleteKeywordsSection
                    keywords={safeEditForm.delete_keywords || []}
                    farewellMessage={safeEditForm.delete_message || ''}
                    onMessageChange={(v) => setEditForm({ ...safeEditForm, delete_message: v })}
                    inputValue={editDeleteInput || ''}
                    onInputChange={setEditDeleteInput}
                    onAdd={() => {
                        const v = (editDeleteInput || '').trim();
                        if (v && !(safeEditForm.delete_keywords || []).includes(v)) {
                            setEditForm({ ...safeEditForm, delete_keywords: [...(safeEditForm.delete_keywords || []), v] });
                        }
                        setEditDeleteInput('');
                    }}
                    onRemove={(kw) => setEditForm({ ...safeEditForm, delete_keywords: (safeEditForm.delete_keywords || []).filter(k => k !== kw) })}
                    deleteLabels={safeEditForm.delete_labels || []}
                    onLabelsChange={v => setEditForm({ ...safeEditForm, delete_labels: v })}
                    labelsList={labelsList}
                />
            )}
        </div>
    );
};

export default SegurancaTab;

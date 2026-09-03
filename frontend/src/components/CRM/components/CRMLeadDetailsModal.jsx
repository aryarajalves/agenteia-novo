import React, { useState } from 'react';

const CRMLeadDetailsModal = ({ lead, onClose, onStageChange, onDeleteLead }) => {
    const [selectedStage, setSelectedStage] = useState(lead?.stage || 'template_enviado');
    const [updating, setUpdating] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!lead) return null;

    let respostasList = [];
    if (lead.respostas_qualificacao) {
        try {
            const parsed = JSON.parse(lead.respostas_qualificacao);
            if (Array.isArray(parsed)) respostasList = parsed;
        } catch {
            respostasList = [{ pergunta: 'Respostas', resposta: String(lead.respostas_qualificacao) }];
        }
    }

    const handleSaveStage = async () => {
        if (selectedStage === lead.stage) {
            onClose();
            return;
        }
        setUpdating(true);
        await onStageChange(lead, selectedStage);
        setUpdating(false);
        onClose();
    };

    const handleConfirmDelete = async () => {
        if (!onDeleteLead) return;
        setIsDeleting(true);
        try {
            await onDeleteLead(lead);
            setShowConfirmDelete(false);
            onClose();
        } catch (err) {
            console.error('Erro ao deletar lead:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="premium-modal-overlay animate-fade-in"
            style={{
                zIndex: 10000,
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.75)'
            }}
        >
            <div
                className="premium-modal-content compact"
                style={{
                    maxWidth: '680px',
                    width: '90%',
                    height: 'auto',
                    minHeight: 'unset',
                    maxHeight: '85vh',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    margin: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            👤
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 800 }}>
                                {lead.contato_nome || 'Lead sem Nome'}
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                📞 {lead.telefone || 'Sem telefone'} • Tabela: <code style={{ color: '#c084fc' }}>{lead.leads_table}</code>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Corpo de Informações */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto' }}>
                    {/* Estágio Atual no CRM */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '1rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                            Mover Estágio no Pipeline:
                        </label>
                        <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#1e293b',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '0.6rem 0.8rem',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                        >
                            <option value="template_enviado">📤 1. Disparo Inicial (Template Enviado)</option>
                            <option value="retentativas">🔁 2. Re-tentativas (Ciclo 2 e 3)</option>
                            <option value="em_atendimento">💬 3. Em Conversa com IA</option>
                            <option value="remarketing">🎧 4. Remarketing D+1 (Áudio + Texto)</option>
                            <option value="comprou">🎉 5. Comprou o Curso (Aluno)</option>
                            <option value="desistiu">🚪 6. Não Converteu / Desistiu</option>
                        </select>
                    </div>

                    {/* Última Mensagem */}
                    {lead.mensagem && (
                        <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '0.85rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.3rem' }}>
                                💬 Última Mensagem do Lead:
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                {lead.mensagem}
                            </div>
                        </div>
                    )}

                    {/* Resposta do Agente */}
                    {lead.ultima_resposta_agente && (
                        <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '10px', padding: '0.85rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', marginBottom: '0.3rem' }}>
                                🤖 Última Resposta do Agente ({lead.agent_name || 'IA'}):
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                {lead.ultima_resposta_agente}
                            </div>
                        </div>
                    )}

                    {/* Respostas de Qualificação */}
                    {respostasList.length > 0 && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '0.85rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#facc15', marginBottom: '0.5rem' }}>
                                📋 Respostas da Qualificação:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {respostasList.map((item, idx) => (
                                    <div key={idx} style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                                        <strong>{item.pergunta || `Pergunta ${idx + 1}`}:</strong> {item.resposta || JSON.stringify(item)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Etiquetas */}
                    {lead.labels && lead.labels.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem' }}>
                                🏷️ Etiquetas no ZapVoice:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {lead.labels.map((lbl, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            fontSize: '0.7rem',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '6px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            color: '#e2e8f0',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    >
                                        {lbl}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer com botões de ação */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowConfirmDelete(true)}
                            className="btn-delete-lead"
                            style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                transition: 'all 0.15s'
                            }}
                        >
                            <span>🗑️</span>
                            <span>Excluir Contato</span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-cancel"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            Fechar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveStage}
                            disabled={updating}
                            className="btn-save"
                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: '#a855f7', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                            {updating ? 'Salvando...' : 'Salvar Estágio'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Popup Modal de Confirmação de Exclusão Compacto e Centralizado */}
            {showConfirmDelete && (
                <div
                    className="premium-modal-overlay animate-fade-in"
                    style={{
                        zIndex: 11000,
                        background: 'rgba(0, 0, 0, 0.85)',
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="premium-modal-content compact"
                        style={{
                            maxWidth: '440px',
                            width: '90%',
                            height: 'auto',
                            minHeight: 'unset',
                            maxHeight: '90vh',
                            background: '#0f172a',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
                            padding: '2rem 1.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1.1rem',
                            textAlign: 'center',
                            margin: 'auto'
                        }}
                    >
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto' }}>
                            🗑️
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>
                            Excluir Contato Permanentemente?
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                            Tem certeza que deseja apagar o contato <strong style={{ color: '#fff' }}>{lead.contato_nome || 'Lead sem Nome'}</strong> ({lead.telefone})? Esta ação não pode ser desfeita.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowConfirmDelete(false)}
                                disabled={isDeleting}
                                className="btn-cancel"
                                style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    padding: '0.55rem 1.25rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRMLeadDetailsModal;

import React from 'react';

const DeleteQuestionFunnelModal = ({ isOpen, funnel, onConfirm, onCancel, loading }) => {
    if (!isOpen || !funnel) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.75)', 
                backdropFilter: 'blur(4px)',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
        >
            <div 
                className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl"
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '440px',
                    width: '90%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
                        🗑️
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>
                            Excluir Funil por Dúvida
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                            Esta ação não poderá ser desfeita.
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                    Tem certeza que deseja excluir o funil <strong>"{funnel.name}"</strong>?
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Gatilho: "{funnel.trigger_question}"
                    </span>
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#1e293b',
                            color: '#cbd5e1',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(funnel.id)}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2"
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: '#dc2626',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: loading ? 'wait' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}
                    >
                        {loading ? '⏳ Excluindo...' : '🗑️ Confirmar Exclusão'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteQuestionFunnelModal;

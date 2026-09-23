import React from 'react';

const QuestionFunnelModalFooter = ({
    loading,
    funnel,
    onClose,
    onSubmit
}) => {
    return (
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.5)' }}>
            <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{ padding: '0.55rem 1.1rem', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={onSubmit}
                disabled={loading}
                style={{ padding: '0.55rem 1.3rem', background: '#3b82f6', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
                {loading ? '⏳ Salvando...' : funnel ? '💾 Salvar Alterações' : '✨ Criar Funil'}
            </button>
        </div>
    );
};

export default QuestionFunnelModalFooter;

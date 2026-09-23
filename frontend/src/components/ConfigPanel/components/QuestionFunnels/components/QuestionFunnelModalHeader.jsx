import React from 'react';

const QuestionFunnelModalHeader = ({ funnel, onClose }) => {
    return (
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎯</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
                        {funnel ? 'Editar Funil por Dúvida' : 'Novo Funil por Dúvida'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        Dispare áudio humanizado e mensagens fixas em vez de textão da IA
                    </p>
                </div>
            </div>
            <button 
                type="button" 
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
            >
                ✕
            </button>
        </div>
    );
};

export default QuestionFunnelModalHeader;

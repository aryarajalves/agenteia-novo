import React from 'react';
import LeadQuestionCard from '../LeadQuestionCard';

const LeadQuestionsList = ({
    loading,
    questions,
    searchTerm,
    onAddToCache,
    onIgnoreQuestion,
    formatDate
}) => {
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <div style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#34d399',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>Carregando dúvidas dos leads...</p>
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
                <span style={{ fontSize: '2rem' }}>🔍</span>
                <h4 style={{ color: '#cbd5e1', margin: '10px 0 6px 0' }}>Nenhuma dúvida encontrada</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                    {searchTerm ? 'Nenhuma mensagem corresponde aos critérios de busca.' : 'Ainda não há mensagens de leads registradas nos webhooks deste agente.'}
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map((q, idx) => (
                <LeadQuestionCard
                    key={`${q.event_id}-${q.sub_index || 0}-${idx}`}
                    question={q}
                    onAddToCache={onAddToCache}
                    onIgnoreQuestion={onIgnoreQuestion}
                    formatDate={formatDate}
                />
            ))}
        </div>
    );
};

export default LeadQuestionsList;

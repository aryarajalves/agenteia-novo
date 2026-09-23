import React from 'react';

const QuestionFunnelsToast = ({ toastMessage }) => {
    if (!toastMessage) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <span>{toastMessage.type === 'error' ? '❌' : '✅'}</span>
            <span>{toastMessage.msg}</span>
        </div>
    );
};

export default QuestionFunnelsToast;

import React from 'react';

const ImportChatStatusBox = ({ isRunning, error, status }) => {
    return (
        <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            fontSize: '0.82rem',
            color: error ? '#fca5a5' : '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            {isRunning && (
                <span style={{
                    display: 'inline-block',
                    animation: 'spin 1.2s linear infinite',
                    fontSize: '0.9rem'
                }}>
                    ⚡
                </span>
            )}
            <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
            }}>
                {error || status}
            </span>
        </div>
    );
};

export default ImportChatStatusBox;

import React from 'react';
import { createPortal } from 'react-dom';

const ToolPromptModal = ({ tool, isOpen, onClose, value, onChange }) => {
    if (!isOpen || !tool) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(12px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '700px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 50px rgba(99, 102, 241, 0.15)'
                }}
            >
                {/* Header do modal */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{tool.webhook_url ? '🔗' : '📅'}</span>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{tool.name}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            borderRadius: '10px',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        ✕
                    </button>
                </div>
                {/* Corpo com textarea grande */}
                <div style={{ padding: '1.5rem' }}>
                    <textarea
                        style={{
                            width: '100%',
                            height: '350px',
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--wh-border)',
                            borderRadius: '12px',
                            padding: '1rem',
                            color: '#fff',
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                            resize: 'none',
                            fontFamily: 'inherit'
                        }}
                        placeholder="Descreva quando esta ferramenta deve ser chamada..."
                        value={value}
                        onChange={onChange}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ToolPromptModal;

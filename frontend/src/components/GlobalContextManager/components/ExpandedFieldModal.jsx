import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../styles/ExpandedFieldModal.css';

export default function ExpandedFieldModal({
    isOpen,
    title,
    subtitle,
    icon = '📝',
    value = '',
    placeholder = 'Digite aqui...',
    onSave,
    onClose
}) {
    const [text, setText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setText(value || '');
        }
    }, [isOpen, value]);

    if (!isOpen) return null;

    const charCount = text ? text.length : 0;
    const wordCount = text?.trim() ? text.trim().split(/\s+/).length : 0;

    const handleSave = () => {
        if (onSave) onSave(text);
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="expanded-field-overlay fade-in" data-testid="expanded-field-overlay">
            <div className="expanded-field-modal" data-testid="expanded-field-modal">
                <div className="modal-header-accent" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #38bdf8)' }}></div>
                
                <div className="expanded-field-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div className="expanded-field-icon-box">
                            {icon}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                                {title}
                            </h3>
                            {subtitle && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="expanded-field-close-btn"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        title="Fechar (Esc)"
                    >
                        ✕
                    </button>
                </div>

                <div className="expanded-field-body">
                    <textarea
                        autoFocus
                        data-testid="expanded-field-textarea"
                        className="expanded-field-textarea"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={placeholder}
                    />
                </div>

                <div className="expanded-field-footer">
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#64748b' }}>
                        <span>Caracteres: <strong style={{ color: '#cbd5e1' }}>{charCount}</strong></span>
                        <span>Palavras: <strong style={{ color: '#cbd5e1' }}>{wordCount}</strong></span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            type="button"
                            data-testid="expanded-field-cancel-btn"
                            onClick={onClose}
                            className="btn-expanded-cancel"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            data-testid="expanded-field-save-btn"
                            onClick={handleSave}
                            className="btn-expanded-save"
                        >
                            ✓ Concluir Edição
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

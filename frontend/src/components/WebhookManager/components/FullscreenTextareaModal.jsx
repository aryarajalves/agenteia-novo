import React, { useEffect } from 'react';

const FullscreenTextareaModal = ({
    isOpen,
    title = 'Editor em Tela Cheia',
    subtitle = '',
    value = '',
    onChange,
    onClose,
    variables = [],
    placeholder = 'Digite aqui...',
    accentColor = '#6366f1'
}) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const charCount = value?.length || 0;
    const wordCount = value?.trim() ? value.trim().split(/\s+/).length : 0;

    const insertVariable = (variable) => {
        if (!onChange) return;
        onChange((value || '') + ` ${variable}`);
    };

    return (
        <div 
            className="premium-modal-overlay animate-fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(5, 7, 15, 0.88)',
                backdropFilter: 'blur(8px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem'
            }}
        >
            <div 
                className="premium-modal-content"
                style={{
                    width: '95vw',
                    maxWidth: '1200px',
                    height: '88vh',
                    background: '#0d1117',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Cabeçalho */}
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.25rem 1.75rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div 
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: `${accentColor}22`,
                                border: `1px solid ${accentColor}44`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem'
                            }}
                        >
                            ⛶
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                                {title}
                            </h3>
                            {subtitle && (
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: accentColor,
                                border: 'none',
                                color: '#fff',
                                padding: '0.55rem 1.25rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: `0 0 16px ${accentColor}44`
                            }}
                        >
                            ✓ Concluir Edição
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            title="Fechar (ESC)"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Barra de Variáveis Rápidas (se houver) */}
                {variables.length > 0 && (
                    <div 
                        style={{
                            padding: '0.75rem 1.75rem',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            flexWrap: 'wrap'
                        }}
                    >
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            🏷️ Inserir Variável:
                        </span>
                        {variables.map((v, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => insertVariable(v)}
                                style={{
                                    background: 'rgba(168, 85, 247, 0.12)',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    color: '#c084fc',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                title="Clique para inserir no texto"
                            >
                                + {v}
                            </button>
                        ))}
                    </div>
                )}

                {/* Área de Texto Expansiva */}
                <div style={{ flex: 1, padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column' }}>
                    <textarea
                        autoFocus
                        value={value || ''}
                        onChange={(e) => onChange && onChange(e.target.value)}
                        placeholder={placeholder}
                        style={{
                            width: '100%',
                            flex: 1,
                            background: '#090d14',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            padding: '1.25rem',
                            resize: 'none',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
                        }}
                    />
                </div>

                {/* Rodapé informativo */}
                <div 
                    style={{
                        padding: '0.85rem 1.75rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(10, 13, 20, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: '#64748b'
                    }}
                >
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <span>Caracteres: <strong style={{ color: '#cbd5e1' }}>{charCount}</strong></span>
                        <span>Palavras: <strong style={{ color: '#cbd5e1' }}>{wordCount}</strong></span>
                    </div>
                    <div>
                        Pressione <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1' }}>ESC</kbd> ou clique em Concluir para voltar
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullscreenTextareaModal;

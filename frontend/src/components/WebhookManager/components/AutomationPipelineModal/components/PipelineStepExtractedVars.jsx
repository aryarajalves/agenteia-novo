import React from 'react';

/**
 * Exibe variáveis salvas e pendentes extraídas do contato
 */
export default function PipelineStepExtractedVars({ metadata = {} }) {
    const saved = metadata?.saved || {};
    const pending = metadata?.pending || [];

    return (
        <div style={{ fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Seção de Extraídas */}
            <div>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#10b981', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✅</span> Extraídas & Salvas
                </h4>
                {Object.keys(saved).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Object.entries(saved).map(([key, val]) => (
                            <div key={key} style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)',
                                padding: '10px 14px', borderRadius: '12px'
                            }}>
                                <code style={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{key}</code>
                                <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }}>{String(val)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Nenhuma variável foi extraída com sucesso até o momento.
                    </p>
                )}
            </div>
            
            {/* Seção de Pendentes */}
            <div>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#6366f1', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏳</span> Aguardando Menção (Pendentes)
                </h4>
                {pending.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {pending.map((key) => (
                            <span key={key} style={{ 
                                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                                color: '#a5b4fc', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                                {key}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Todas as variáveis mapeadas já foram preenchidas ou nenhuma pendência.
                    </p>
                )}
            </div>
        </div>
    );
}

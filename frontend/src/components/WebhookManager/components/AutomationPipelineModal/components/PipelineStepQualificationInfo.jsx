import React from 'react';

export default function PipelineStepQualificationInfo({ metadata }) {
    if (!metadata) return null;

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                    Etiquetas no Contato:
                </span>
                {metadata.labels_applied?.length > 0 ? (
                    metadata.labels_applied.map((lbl, idx) => (
                        <span key={idx} style={{
                            fontSize: '0.78rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            🏷️ {lbl}
                        </span>
                    ))
                ) : (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        {metadata.lead_classification ? `Nenhuma etiqueta aplicada (Lead ${metadata.lead_classification})` : 'Nenhuma etiqueta aplicada'}
                    </span>

                )}
                
                {metadata.labels_removed?.length > 0 && (
                    <span style={{
                        fontSize: '0.72rem',
                        color: '#64748b',
                        marginLeft: 'auto'
                    }}>
                        (Removidas: {metadata.labels_removed.join(', ')})
                    </span>
                )}
            </div>
        </div>
    );
}

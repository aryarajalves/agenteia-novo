import React from 'react';

export default function PipelineProcessingStatus({
    status,
    isTimeout
}) {
    if (!['processing', 'received', 'pending'].includes(status)) {
        return null;
    }

    if (isTimeout) {
        return (
            <div style={{ position: 'relative' }}>
                {/* Ponto da Timeline Vermelho */}
                <div style={{ 
                    position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                    borderRadius: '50%', background: '#ef4444', border: '4px solid #0f172a',
                    boxShadow: '0 0 12px #ef4444', zIndex: 1
                }} />
                
                <div style={{ 
                    background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)', 
                    borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem'
                }}>
                    <div style={{ fontSize: '1.8rem', animation: 'pulse 1s infinite' }}>⚠️</div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5' }}>
                            Falha no Processamento (Timeout)
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#f87171', fontWeight: 600, lineHeight: 1.4 }}>
                            A automação excedeu o tempo limite de 90 segundos sem resposta. Isso ocorre quando há lentidão extrema na API do LLM, falhas na conexão do calendário ou caso a fila de tarefas em background tenha sido interrompida.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Ponto da Timeline Animado */}
            <div style={{ 
                position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                borderRadius: '50%', background: '#6366f1', border: '4px solid #0f172a',
                boxShadow: '0 0 12px #6366f1', zIndex: 1,
                animation: 'pulse 1.5s infinite'
            }} />
            
            <div style={{ 
                background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.2)', 
                borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                animation: 'pulseCard 2s infinite'
            }}>
                <div className="pipeline-spinner" />
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#a5b4fc' }}>
                        ⚙️ Processando Automação...
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>
                        Executando fluxos subsequentes. Aguarde a conclusão da automação.
                    </p>
                </div>
            </div>
        </div>
    );
}

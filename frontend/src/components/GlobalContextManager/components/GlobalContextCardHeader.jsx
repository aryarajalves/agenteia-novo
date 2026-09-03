import React from 'react';

export default function GlobalContextCardHeader({ onAddVariable }) {
    return (
        <div className="card-header-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                    width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.1)', 
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '1.5rem' 
                }}>
                    🌍
                </div>
                <div>
                    <h3 style={{ margin: 0 }}>Variáveis de Contexto Globais</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        Disponíveis para todos os Agentes. Use &#123;key&#125; nos prompts.
                    </p>
                </div>
            </div>
            <button className="add-var-btn" onClick={onAddVariable}>
                + Nova Variável
            </button>
        </div>
    );
}

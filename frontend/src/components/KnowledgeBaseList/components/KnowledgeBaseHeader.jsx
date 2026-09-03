import React from 'react';
import { Link } from 'react-router-dom';

export default function KnowledgeBaseHeader({ activeTab, onImportJSON }) {
    return (
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
                <h1>{activeTab === 'inbox' ? 'Inbox de Dúvidas' : 'Centrais de Conhecimento'}</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {activeTab === 'inbox' 
                        ? 'Responda perguntas pendentes e melhore a inteligência dos seus agentes.' 
                        : 'Gerencie bibliotecas de respostas e ensine seus agentes.'}
                </p>
            </div>
            {activeTab !== 'inbox' && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label className="create-agent-btn" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.8rem 1.2rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                        <span>📥</span> Importar Base (JSON)
                        <input type="file" accept=".json" onChange={onImportJSON} style={{ display: 'none' }} />
                    </label>
                    <Link to="/knowledge-bases/new" className="create-agent-btn-shiny">
                        <span>+</span> Nova Base
                    </Link>
                </div>
            )}
        </div>
    );
}

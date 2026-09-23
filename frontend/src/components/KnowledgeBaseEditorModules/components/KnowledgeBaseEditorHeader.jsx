import React from 'react';
import { Link } from 'react-router-dom';
import { viewTabStyle } from '../styles/editorStyles';

const KnowledgeBaseEditorHeader = ({ isNew, view, navigate }) => {
    return (
        <>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/knowledge-bases" className="access-btn-back">
                    <span style={{ fontSize: '1.2rem' }}>‹</span> Voltar para lista
                </Link>
                
                {!isNew && (
                    <div className="view-selector" style={{ 
                        display: 'flex', 
                        gap: '5px', 
                        background: 'rgba(255,255,255,0.03)', 
                        padding: '5px', 
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <button 
                            type="button"
                            onClick={() => navigate(`?view=metadata`)}
                            className={`tab-btn ${view === 'metadata' ? 'active' : ''}`}
                            style={viewTabStyle(view === 'metadata')}
                        >
                            ⚙️ Identificação
                        </button>
                        <button 
                            type="button"
                            onClick={() => navigate(`?view=content`)}
                            className={`tab-btn ${view === 'content' ? 'active' : ''}`}
                            style={viewTabStyle(view === 'content')}
                        >
                            📚 Conteúdo
                        </button>
                    </div>
                )}
            </div>

            <h1 className="panel-title" style={{
                fontSize: '2.5rem',
                marginBottom: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px -5px rgba(99, 102, 241, 0.4)',
                    flexShrink: 0
                }}>
                    <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                        {view === 'metadata' ? '⚙️' : '📚'}
                    </span>
                </div>
                <span>{isNew ? 'Nova Base de Conhecimento' : (view === 'metadata' ? 'Configurar Identificação' : 'Gerenciar Conteúdo')}</span>
            </h1>
        </>
    );
};

export default KnowledgeBaseEditorHeader;

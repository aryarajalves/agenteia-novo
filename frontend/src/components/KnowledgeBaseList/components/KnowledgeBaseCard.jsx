import React from 'react';
import { Link } from 'react-router-dom';

export default function KnowledgeBaseCard({
    base,
    isSelected,
    onToggleSelect,
    onExportJSON,
    onDeleteClick
}) {
    const isProduct = base.kb_type === 'product';

    return (
        <div className="agent-card" style={{ position: 'relative' }}>
            <div 
                onClick={() => onToggleSelect(base.id)}
                style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid',
                    borderColor: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)')}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
            >
                {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
            </div>

            <div className="agent-card-header" style={{ paddingLeft: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{isProduct ? '📦' : '💬'}</span>
                    <h3 title={base.name}>{base.name}</h3>
                </div>
                <span className="agent-model-badge" style={{ flexShrink: 0 }}>
                    KB #{base.id}
                </span>
            </div>

            <p className="agent-description" style={{ minHeight: '2.9rem' }}>
                {base.description || "Sem descrição definida para esta base de conhecimento."}
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                <span style={{
                    fontSize: '0.65rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: isProduct ? 'rgba(168, 85, 247, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    color: isProduct ? '#a855f7' : '#6366f1',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                }}>
                    {isProduct ? 'Catálogo' : 'FAQ / QA'}
                </span>
            </div>

            <div className="kb-stat">
                <span className="kb-stat-value">{base.items?.length || 0}</span>
                <span className="kb-stat-label">Itens de Conhecimento</span>
            </div>

            <div className="agent-actions">
                <Link to={`/knowledge-bases/${base.id}?view=content`} className="access-btn">
                    Editar Conteúdo
                </Link>
                <button
                    onClick={(e) => onExportJSON(e, base.id)}
                    className="delete-btn"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#818cf8' }}
                    title="Exportar Base (JSON)"
                >
                    📤
                </button>
                <Link 
                    to={`/knowledge-bases/${base.id}?view=metadata`} 
                    className="delete-btn" 
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
                    title="Configurações da Base"
                >
                    ⚙️
                </Link>
                <button
                    onClick={(e) => onDeleteClick(e, base.id, base.name)}
                    className="delete-btn"
                    title="Excluir Base"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}

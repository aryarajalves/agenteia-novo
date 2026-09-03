import React from 'react';
import { Link } from 'react-router-dom';
import KnowledgeBaseCard from './KnowledgeBaseCard';

export default function KnowledgeBaseGrid({
    bases,
    filterType,
    selectedBases,
    onToggleSelectBase,
    onExportJSON,
    onDeleteClick
}) {
    if (bases.length === 0) {
        return (
            <div className="agents-grid">
                <div className="empty-state" style={{
                    gridColumn: '1/-1',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)',
                    borderRadius: '2.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>
                    <div>
                        <h2 style={{ color: 'white', marginBottom: '0.75rem', fontSize: '1.8rem', fontWeight: 800 }}>
                            Nenhuma base encontrada
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6' }}>
                            {filterType === 'all'
                                ? "Crie sua primeira biblioteca de conhecimento para começar a treinar seus agentes de IA com dados reais."
                                : `Você ainda não possui bases do tipo ${filterType === 'qa' ? 'FAQ' : 'Produtos'}.`}
                        </p>
                    </div>
                    {filterType === 'all' && (
                        <Link to="/knowledge-bases/new" className="create-agent-btn" style={{ 
                            marginTop: '1.5rem',
                            padding: '1.2rem 2.5rem',
                            fontSize: '1.1rem',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            border: 'none',
                            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)',
                            transform: 'scale(1.05)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            🚀 Criar Minha Primeira Base
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="agents-grid">
            {bases.map(base => (
                <KnowledgeBaseCard
                    key={base.id}
                    base={base}
                    isSelected={selectedBases.has(base.id)}
                    onToggleSelect={onToggleSelectBase}
                    onExportJSON={onExportJSON}
                    onDeleteClick={onDeleteClick}
                />
            ))}
        </div>
    );
}

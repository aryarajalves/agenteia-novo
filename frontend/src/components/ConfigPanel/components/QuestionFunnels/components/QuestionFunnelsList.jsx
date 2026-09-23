import React from 'react';
import QuestionFunnelCard from '../QuestionFunnelCard';
import Pagination from '../Pagination';

const QuestionFunnelsList = ({
    loading,
    displayedFunnels,
    searchTerm,
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onToggleActive,
    onEdit,
    onDelete,
    onTest,
    onClearSearch,
    onCreateNew
}) => {
    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="tab-loading-spinner" style={{ marginBottom: '1rem' }}></div>
                Carregando funis por dúvida...
            </div>
        );
    }

    if (displayedFunnels.length > 0) {
        return (
            <div>
                {displayedFunnels.map(funnel => (
                    <QuestionFunnelCard 
                        key={funnel.id}
                        funnel={funnel}
                        onToggleActive={onToggleActive}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onTest={onTest}
                    />
                ))}

                {/* Paginação (20 por página) */}
                <Pagination 
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                />
            </div>
        );
    }

    if (searchTerm.trim()) {
        return (
            <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <h4 style={{ color: '#f8fafc', fontSize: '1.05rem', margin: '0 0 0.4rem 0' }}>
                    Nenhum funil encontrado para "{searchTerm}"
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                    Tente buscar por termos mais genéricos ou limpe o filtro de busca.
                </p>
                <button
                    type="button"
                    onClick={onClearSearch}
                    style={{
                        padding: '0.45rem 1.15rem',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    Limpar busca
                </button>
            </div>
        );
    }

    return (
        <div style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
            <h4 style={{ color: '#f8fafc', fontSize: '1.05rem', margin: '0 0 0.4rem 0' }}>
                Nenhum funil por dúvida cadastrado ainda
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
                Cadastre uma pergunta frequente estratégica (ex: "como funciona o curso?") e configure um áudio gravado em primeira pessoa para aumentar drasticamente sua conversão!
            </p>
            <button
                type="button"
                onClick={onCreateNew}
                style={{
                    padding: '0.55rem 1.25rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                }}
            >
                + Criar Primeiro Funil por Dúvida
            </button>
        </div>
    );
};

export default QuestionFunnelsList;

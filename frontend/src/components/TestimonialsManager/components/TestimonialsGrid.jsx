import React from 'react';
import TestimonialCard from '../../testimonials/TestimonialCard';

export default function TestimonialsGrid({
    loading,
    paginatedItems,
    testimonials,
    categories,
    onEdit,
    onDelete,
    onMediaError,
    onMove
}) {
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ borderTopColor: '#10b981' }}></div>
                <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>Carregando depoimentos...</p>
            </div>
        );
    }

    if (paginatedItems.length === 0) {
        return (
            <div style={{
                textAlign: 'center', padding: '4rem 2rem', background: 'rgba(20, 18, 30, 0.2)',
                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px'
            }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📂</span>
                <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Nenhum depoimento encontrado</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Não há mídias correspondentes aos filtros aplicados.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px'
        }}>
            {paginatedItems.map(item => {
                const categorySiblings = testimonials.filter(t => t.category === item.category && t.media_type === item.media_type);
                const siblingIndex = categorySiblings.findIndex(t => t.id === item.id);
                return (
                    <TestimonialCard
                        key={item.id}
                        item={item}
                        categories={categories}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onMediaError={onMediaError}
                        onMove={onMove}
                        isFirst={siblingIndex <= 0}
                        isLast={siblingIndex === -1 || siblingIndex === categorySiblings.length - 1}
                    />
                );
            })}
        </div>
    );
}

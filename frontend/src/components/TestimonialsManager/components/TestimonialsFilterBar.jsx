import React from 'react';

export default function TestimonialsFilterBar({
    categories,
    categoryFilter,
    setCategoryFilter,
    mediaTypeFilter,
    setMediaTypeFilter,
    pageSize,
    setPageSize
}) {
    return (
        <div style={{
            display: 'flex', gap: '20px', background: 'rgba(20, 18, 30, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px',
            borderRadius: '16px', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>
                    Filtrar Curso/Categoria:
                </label>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                        background: 'rgba(0,0,0,0.25)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px',
                        borderRadius: '10px', outline: 'none', cursor: 'pointer', minWidth: '180px'
                    }}
                >
                    <option value="all">📁 Todos os Cursos</option>
                    {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>
                    Filtrar Tipo de Mídia:
                </label>
                <select
                    value={mediaTypeFilter}
                    onChange={(e) => setMediaTypeFilter(e.target.value)}
                    style={{
                        background: 'rgba(0,0,0,0.25)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px',
                        borderRadius: '10px', outline: 'none', cursor: 'pointer', minWidth: '150px'
                    }}
                >
                    <option value="all">🎬 Todas as Mídias</option>
                    <option value="image">🖼️ Imagens / Fotos</option>
                    <option value="video">📹 Vídeos</option>
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>
                    Exibir por Página:
                </label>
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{
                        background: 'rgba(0,0,0,0.25)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px',
                        borderRadius: '10px', outline: 'none', cursor: 'pointer', width: '90px'
                    }}
                >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                </select>
            </div>
        </div>
    );
}

import React from 'react';

export default function TestimonialsHeader({
    onOpenManageCategories,
    onOpenUploadModal
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '20px' }}>
            <h1 className="panel-title" style={{ fontSize: '2.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                    width: '50px', height: '50px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px -5px rgba(16, 185, 129, 0.4)'
                }}>
                    <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>💬</span>
                </div>
                Gerenciador de Depoimentos
            </h1>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={onOpenManageCategories}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '12px 24px', borderRadius: '12px',
                        color: '#fff', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    📁 Gerenciar Categorias
                </button>

                <button
                    onClick={onOpenUploadModal}
                    style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        padding: '12px 24px', borderRadius: '12px', border: 'none',
                        color: '#fff', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    ➕ Enviar Novo Depoimento
                </button>
            </div>
        </div>
    );
}

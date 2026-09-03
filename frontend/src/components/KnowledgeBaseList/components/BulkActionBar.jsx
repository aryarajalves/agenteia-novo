import React from 'react';

export default function BulkActionBar({
    selectedCount,
    onOpenConfirm,
    onClearSelection
}) {
    if (selectedCount === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
            padding: '0.75rem 1.5rem',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(79, 70, 229, 0.4)',
            animation: 'slideUpCentered 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600
        }}>
            <span>{selectedCount} base{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}</span>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            <button 
                onClick={onOpenConfirm}
                style={{ 
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', 
                    color: '#fff', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', 
                    fontWeight: 700, transition: 'all 0.2s' 
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Excluir Selecionadas
            </button>
            <button 
                onClick={onClearSelection}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
                Cancelar
            </button>
        </div>
    );
}

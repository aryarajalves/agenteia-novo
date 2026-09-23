import React from 'react';

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear().toString().slice(-2);
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');
        return `${d}/${m}/${y} ${hh}:${mm}`;
    } catch (e) {
        return dateString;
    }
};

export const getStatusBadge = (task) => {
    const status = task.status;
    const styles = {
        PENDING: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', label: '⏳ Na Fila' },
        PROCESSING: { bg: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', label: '⚙️ Processando' },
        SUCCESS: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: '✅ Concluído' },
        FAILURE: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: '❌ Erro' }
    };
    const style = styles[status] || { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: status };
    
    return (
        <span 
            className="status-badge" 
            style={{ background: style.bg, color: style.color, cursor: status === 'FAILURE' ? 'help' : 'default' }}
            title={status === 'FAILURE' ? (task.error_message || 'Erro desconhecido') : undefined}
        >
            {style.label}
        </span>
    );
};

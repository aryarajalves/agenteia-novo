export const LEVELS = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];

export const LEVEL_COLORS = {
    CRITICAL: { bg: 'rgba(239, 68, 68, 0.25)', color: '#fecaca' },
    ERROR: { bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
    WARNING: { bg: 'rgba(217, 119, 6, 0.18)', color: '#fbbf24' },
    INFO: { bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
    DEBUG: { bg: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8' },
};

export const TAIL_OPTIONS = [500, 1000, 2000, 5000];
export const PAGE_SIZE_OPTIONS = [1000, 2500, 5000, 10000];

export const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    outline: 'none',
    fontSize: '0.85rem',
};

export const chipStyle = (active, colorSet) => ({
    padding: '0.4rem 0.9rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? (colorSet ? colorSet.color : '#8b5cf6') : 'rgba(255,255,255,0.1)'}`,
    background: active ? (colorSet ? colorSet.bg : 'rgba(139, 92, 246, 0.25)') : 'rgba(255,255,255,0.03)',
    color: active ? (colorSet ? colorSet.color : '#c4b5fd') : '#94a3b8',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
});

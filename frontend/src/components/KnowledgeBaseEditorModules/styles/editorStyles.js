export const typeBtnStyle = (isActive, activeColor, isDisabled = false) => ({
    background: isActive ? `${activeColor}15` : 'rgba(255,255,255,0.02)',
    borderColor: isActive ? activeColor : 'rgba(255,255,255,0.05)',
    color: isActive ? activeColor : '#94a3b8',
    boxShadow: isActive ? `0 0 20px -5px ${activeColor}30` : 'none',
    transform: isActive ? 'scale(1.02)' : 'none',
    opacity: isDisabled && !isActive ? 0.3 : 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer'
});

export const viewTabStyle = (isActive) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
    color: isActive ? '#818cf8' : '#64748b',
    transition: 'all 0.3s'
});

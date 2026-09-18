import React from 'react';

export const LabelMultiSelect = ({ selected = [], options = [], onChange, accentColor = '#818cf8', placeholder = 'Buscar etiqueta...' }) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const ref = React.useRef(null);

    React.useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = (options || []).filter(o => typeof o === 'string' && o.toLowerCase().includes(search.toLowerCase()));

    const cleanSelected = (selected || []).filter(s => typeof s === 'string' && s.trim().length > 0);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ background: '#0f172a', border: `1px solid ${open ? accentColor + '66' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', minHeight: '42px', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', transition: 'border 0.15s' }}
            >
                {cleanSelected.length === 0 ? (
                    <span style={{ color: '#475569', fontSize: '0.82rem' }}>Nenhuma selecionada</span>
                ) : (
                    cleanSelected.map((s, idx) => (
                        <span key={`${s}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: accentColor + '22', border: `1px solid ${accentColor}44`, borderRadius: '20px', padding: '2px 8px 2px 10px', fontSize: '0.75rem', color: accentColor, fontWeight: 600 }}>
                            {s}
                            <button type="button" onClick={e => { e.stopPropagation(); onChange(cleanSelected.filter(x => x !== s)); }}
                                style={{ background: 'none', border: 'none', color: accentColor, cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1, padding: 0 }}>✕</button>
                        </span>
                    ))
                )}
                <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.75rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#0f172a', border: `1px solid ${accentColor}44`, borderRadius: '8px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem' }}>
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && search.trim()) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const clean = search.trim();
                                    if (!(selected || []).includes(clean)) {
                                        onChange([...(selected || []), clean]);
                                    }
                                    setSearch('');
                                }
                            }}
                            placeholder={placeholder}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.45rem 0.7rem', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                        />
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div 
                                onClick={e => {
                                    e.stopPropagation();
                                    if (search.trim()) {
                                        const clean = search.trim();
                                        if (!(selected || []).includes(clean)) onChange([...(selected || []), clean]);
                                        setSearch('');
                                    }
                                }}
                                style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: search.trim() ? accentColor : '#475569', cursor: search.trim() ? 'pointer' : 'default' }}
                            >
                                {search.trim() ? `+ Adicionar "${search.trim()}"` : 'Nenhuma etiqueta encontrada'}
                            </div>
                        ) : (
                            <>
                                {filtered.map(opt => {
                                    const isSelected = (selected || []).includes(opt);
                                    return (
                                        <div
                                            key={opt}
                                            onClick={e => { e.stopPropagation(); onChange(isSelected ? (selected || []).filter(x => x !== opt) : [...(selected || []), opt]); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', cursor: 'pointer', background: isSelected ? accentColor + '18' : 'transparent', transition: 'background 0.1s' }}
                                        >
                                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${isSelected ? accentColor : '#334155'}`, background: isSelected ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                                                {isSelected && <span style={{ color: '#0f172a', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                                            </div>
                                            <span style={{ fontSize: '0.82rem', color: isSelected ? '#fff' : '#94a3b8' }}>{opt}</span>
                                        </div>
                                    );
                                })}
                                {search.trim() && !filtered.includes(search.trim()) && (
                                    <div 
                                        onClick={e => {
                                            e.stopPropagation();
                                            const clean = search.trim();
                                            if (!(selected || []).includes(clean)) onChange([...(selected || []), clean]);
                                            setSearch('');
                                        }}
                                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', color: accentColor, cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}
                                    >
                                        + Adicionar "{search.trim()}"
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    {(selected || []).length > 0 && (
                        <div style={{ padding: '0.4rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: accentColor }}>{(selected || []).length} selecionada(s)</span>
                            <button type="button" onClick={e => { e.stopPropagation(); onChange([]); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}>Limpar</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const LabelSingleSelect = ({ selected = '', options = [], onChange, accentColor = '#818cf8', placeholder = 'Buscar etiqueta...' }) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const ref = React.useRef(null);

    React.useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = (options || []).filter(o => typeof o === 'string' && o.toLowerCase().includes(search.toLowerCase()));

    const cleanSingle = typeof selected === 'string' && selected.trim().length > 0 ? selected.trim() : '';

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ background: '#0f172a', border: `1px solid ${open ? accentColor + '66' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', minHeight: '42px', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', transition: 'all 0.15s' }}
            >
                {!cleanSingle ? (
                    <span style={{ color: '#475569', fontSize: '0.82rem' }}>Nenhuma selecionada</span>
                ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: accentColor + '22', border: `1px solid ${accentColor}44`, borderRadius: '20px', padding: '2px 8px 2px 10px', fontSize: '0.75rem', color: accentColor, fontWeight: 600 }}>
                        {cleanSingle}
                        <button type="button" onClick={e => { e.stopPropagation(); onChange(''); }}
                            style={{ background: 'none', border: 'none', color: accentColor, cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1, padding: 0 }}>✕</button>
                    </span>
                )}
                <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.75rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#0f172a', border: `1px solid ${accentColor}44`, borderRadius: '8px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem' }}>
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={placeholder}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.45rem 0.7rem', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                        />
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Nenhuma etiqueta encontrada</div>
                        ) : filtered.map(opt => {
                            const isSelected = selected === opt;
                            return (
                                <div
                                    key={opt}
                                    onClick={e => { e.stopPropagation(); onChange(isSelected ? '' : opt); setOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', cursor: 'pointer', background: isSelected ? accentColor + '18' : 'transparent', transition: 'background 0.1s' }}
                                >
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${isSelected ? accentColor : '#334155'}`, background: isSelected ? accentColor : 'transparent', flexShrink: 0, transition: 'all 0.1s' }} />
                                    <span style={{ fontSize: '0.82rem', color: isSelected ? '#fff' : '#94a3b8' }}>{opt}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

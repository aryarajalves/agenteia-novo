import React, { useState, useRef, useEffect } from 'react';

const FollowupStepWhatsAppTemplate = ({
    stepIndex: i,
    stepItem: st,
    safeEditForm,
    setEditForm,
    updateStepProperty,
    zapvoiceTemplates = [],
    loadingTemplates = false,
    fetchZapvoiceTemplates,
    templateSearchTerm = '',
    setTemplateSearchTerm,
    uploadingHeaderMedia,
    handleUploadHeaderMedia
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const filteredTemplates = zapvoiceTemplates.filter(t => 
        !templateSearchTerm || t.name.toLowerCase().includes(templateSearchTerm.toLowerCase())
    );
    const selectedTpl = zapvoiceTemplates.find(t => t.name === st.template_name);
    const bodyComp = selectedTpl?.components?.find(c => c.type === 'BODY');
    const headerComp = selectedTpl?.components?.find(c => c.type === 'HEADER');
    
    const bodyMatches = Array.from(new Set(Array.from((bodyComp?.text || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => m[1]))).sort((a,b) => Number(a)-Number(b));
    const headerMatches = headerComp?.format === 'TEXT' ? Array.from(new Set(Array.from((headerComp?.text || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => m[1]))).sort((a,b) => Number(a)-Number(b)) : [];
    const isHeaderMedia = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format);

    const updateVariable = (key, value) => {
        const currentVars = st.template_variables || {};
        const nextVars = { ...currentVars, [key]: value };
        updateStepProperty('template_variables', nextVars);
    };

    let previewText = bodyComp?.text || 'Template oficial selecionado';
    bodyMatches.forEach(varNum => {
        const val = st.template_variables?.[`body_${varNum}`] || `{{${varNum}}}`;
        previewText = previewText.replaceAll(`{{${varNum}}}`, `[${val}]`);
    });

    return (
        <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="premium-label" style={{ fontSize: '0.7rem', color: '#34d399', margin: 0 }}>
                    📱 Template Oficial Meta/WhatsApp (ZapVoice)
                </label>
                <button
                    type="button"
                    onClick={fetchZapvoiceTemplates}
                    disabled={loadingTemplates}
                    style={{
                        background: 'rgba(52, 211, 153, 0.12)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        color: '#34d399',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s'
                    }}
                >
                    {loadingTemplates ? '⏳ Atualizando...' : '🔄 Sincronizar Templates'}
                </button>
            </div>

            {/* Dropdown com Busca Integrada (Filtro só aparece ao abrir o dropdown) */}
            <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
                <button
                    type="button"
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="premium-input"
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '0.55rem 0.8rem',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#fff',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedTpl 
                            ? `${selectedTpl.name} (${selectedTpl.language || 'pt_BR'})${selectedTpl.status ? ` • ${selectedTpl.status}` : ''}`
                            : (st.template_name ? st.template_name : `-- Selecione um Template Aprovado (${zapvoiceTemplates.length} disponíveis) --`)
                        }
                    </span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.5rem' }}>
                        {isDropdownOpen ? '▲' : '▼'}
                    </span>
                </button>

                {isDropdownOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            background: '#0f172a',
                            border: '1px solid rgba(52, 211, 153, 0.35)',
                            borderRadius: '10px',
                            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.9)',
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                        }}
                    >
                        {/* Campo de Busca dentro do Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                autoFocus
                                placeholder="🔍 Filtrar templates pelo nome..."
                                value={templateSearchTerm}
                                onChange={e => setTemplateSearchTerm(e.target.value)}
                                className="premium-input"
                                style={{
                                    fontSize: '0.78rem',
                                    padding: '0.4rem 0.6rem',
                                    paddingLeft: '1.8rem',
                                    width: '100%',
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', opacity: 0.5 }}>
                                🔍
                            </span>
                        </div>

                        {/* Lista de Opções Rolável */}
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div
                                onClick={() => {
                                    const nextStep = { 
                                        ...st, 
                                        template_name: '',
                                        language: 'pt_BR',
                                        template_components: [],
                                        template_header_type: 'TEXT',
                                        template_variables: {},
                                        template_header_media: ''
                                    };
                                    const newSteps = [...safeEditForm.followup_steps];
                                    newSteps[i] = nextStep;
                                    setEditForm({ ...safeEditForm, followup_steps: newSteps });
                                    setIsDropdownOpen(false);
                                }}
                                style={{
                                    padding: '0.45rem 0.6rem',
                                    fontSize: '0.78rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    background: !st.template_name ? 'rgba(255,255,255,0.06)' : 'transparent',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = !st.template_name ? 'rgba(255,255,255,0.06)' : 'transparent'}
                            >
                                -- Nenhum template selecionado --
                            </div>

                            {filteredTemplates.length === 0 ? (
                                <div style={{ padding: '0.6rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                                    Nenhum template encontrado
                                </div>
                            ) : (
                                filteredTemplates.map((tpl, tIdx) => {
                                    const isSelected = tpl.name === st.template_name;
                                    return (
                                        <div
                                            key={tIdx}
                                            onClick={() => {
                                                const nextStep = { 
                                                    ...st, 
                                                    template_name: tpl.name,
                                                    language: tpl.language || 'pt_BR',
                                                    template_components: tpl.components || [],
                                                    template_header_type: tpl.components?.find(c => c.type === 'HEADER')?.format || 'TEXT',
                                                    template_variables: st.template_variables || {},
                                                    template_header_media: st.template_header_media || ''
                                                };
                                                const newSteps = [...safeEditForm.followup_steps];
                                                newSteps[i] = nextStep;
                                                setEditForm({ ...safeEditForm, followup_steps: newSteps });
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: '0.45rem 0.6rem',
                                                fontSize: '0.78rem',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                color: isSelected ? '#34d399' : '#e2e8f0',
                                                background: isSelected ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(52, 211, 153, 0.15)' : 'transparent'}
                                        >
                                            <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                                                {tpl.name} ({tpl.language || 'pt_BR'})
                                            </span>
                                            {tpl.status && (
                                                <span style={{ fontSize: '0.68rem', opacity: 0.8, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
                                                    {tpl.status}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isHeaderMedia && (
                <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🖼️ Mídia do Cabeçalho (Header: {headerComp.format})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder={`URL da ${headerComp.format.toLowerCase()} (ex: https://...)`}
                            value={st.template_header_media || ''}
                            onChange={e => updateStepProperty('template_header_media', e.target.value)}
                            className="premium-input"
                            style={{ flex: 1, fontSize: '0.78rem' }}
                        />
                        <label style={{
                            background: uploadingHeaderMedia ? '#64748b' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#fff',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: uploadingHeaderMedia ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            whiteSpace: 'nowrap'
                        }}>
                            {uploadingHeaderMedia ? '⏳ Enviando...' : '📁 Upload'}
                            <input
                                type="file"
                                accept={headerComp.format === 'VIDEO' ? 'video/*' : headerComp.format === 'DOCUMENT' ? '.pdf,.doc,.docx' : 'image/*'}
                                style={{ display: 'none' }}
                                disabled={uploadingHeaderMedia}
                                onChange={e => e.target.files?.[0] && handleUploadHeaderMedia(i, e.target.files[0], headerComp.format)}
                            />
                        </label>
                    </div>
                </div>
            )}

            {headerMatches.length > 0 && (
                <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.4rem' }}>
                        🏷️ Variáveis do Cabeçalho (Header)
                    </div>
                    {headerMatches.map((varNum) => (
                        <div key={varNum} style={{ marginBottom: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Variável {`{{${varNum}}}`}:</span>
                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <code onClick={() => updateVariable(`header_${varNum}`, '{primeiro_nome}')} style={{ fontSize: '0.62rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{primeiro_nome}'}</code>
                                    <code onClick={() => updateVariable(`header_${varNum}`, '{nome}')} style={{ fontSize: '0.62rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{nome}'}</code>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Digite o valor ou selecione uma tag..."
                                value={st.template_variables?.[`header_${varNum}`] || ''}
                                onChange={e => updateVariable(`header_${varNum}`, e.target.value)}
                                className="premium-input"
                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {bodyMatches.length > 0 && (
                <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d8b4fe', marginBottom: '0.4rem' }}>
                        🏷️ Variáveis do Corpo (Body)
                    </div>
                    {bodyMatches.map((varNum) => (
                        <div key={varNum} style={{ marginBottom: '0.45rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Variável {`{{${varNum}}}`}:</span>
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    <code onClick={() => updateVariable(`body_${varNum}`, '{primeiro_nome}')} style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{primeiro_nome}'}</code>
                                    <code onClick={() => updateVariable(`body_${varNum}`, '{nome}')} style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{nome}'}</code>
                                    <code onClick={() => updateVariable(`body_${varNum}`, '{telefone}')} style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{telefone}'}</code>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Digite o valor ou selecione uma tag..."
                                value={st.template_variables?.[`body_${varNum}`] || ''}
                                onChange={e => updateVariable(`body_${varNum}`, e.target.value)}
                                className="premium-input"
                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {st.template_name && (
                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>👁️ Prévia em Tempo Real: <strong>{st.template_name}</strong></span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Idioma: {st.language || 'pt_BR'}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#f1f5f9', whiteSpace: 'pre-wrap', lineHeight: '1.45', background: '#070a10', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {previewText}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowupStepWhatsAppTemplate;

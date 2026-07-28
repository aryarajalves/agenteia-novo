import React, { useState } from 'react';

const LeadFilterBar = ({
    search,
    onSearch,
    podeEnviar,
    janelaAberta,
    semMensagens,
    dateStart,
    dateEnd,
    onFilterChange
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Verifica se algum filtro avançado está ativo para exibir badge de destaque
    const hasActiveAdvancedFilters = 
        (janelaAberta && janelaAberta !== 'all') ||
        (semMensagens && semMensagens !== 'all') ||
        Boolean(dateStart) ||
        Boolean(dateEnd);

    const handleClearFilters = () => {
        onSearch('');
        onFilterChange({
            podeEnviar: 'all',
            janelaAberta: 'all',
            semMensagens: 'all',
            dateStart: '',
            dateEnd: ''
        });
    };

    return (
        <div style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1.1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            backdropFilter: 'blur(12px)'
        }}>
            {/* Linha Principal: Busca Ampla + Permissão + Botão Mais Opções + Filtrar */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '0.85rem',
                width: '100%'
            }}>
                {/* Campo de Busca de Destaque Amplo */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#a5b4fc',
                        textTransform: 'uppercase',
                        marginBottom: '0.4rem',
                        letterSpacing: '0.06em',
                        height: '1rem'
                    }}>
                        🔍 BUSCAR CONTATO
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{
                            position: 'absolute',
                            left: '14px',
                            fontSize: '1rem',
                            opacity: 0.7,
                            pointerEvents: 'none',
                            color: '#818cf8'
                        }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nome, número de telefone ou mensagem..."
                            value={search}
                            onChange={e => onSearch(e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                boxSizing: 'border-box',
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1.5px solid rgba(99, 102, 241, 0.5)',
                                boxShadow: '0 0 14px rgba(99, 102, 241, 0.18)',
                                borderRadius: '10px',
                                padding: '0 1rem 0 2.6rem',
                                color: '#f8fafc',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                outline: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = '#818cf8';
                                e.target.style.boxShadow = '0 0 18px rgba(99, 102, 241, 0.4)';
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                                e.target.style.boxShadow = '0 0 14px rgba(99, 102, 241, 0.18)';
                            }}
                        />
                    </div>
                </div>

                {/* Filtro Rápido de Permissão */}
                <div style={{ width: '135px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        marginBottom: '0.4rem',
                        letterSpacing: '0.06em',
                        height: '1rem'
                    }}>
                        🛡️ PERMISSÃO
                    </label>
                    <select
                        value={podeEnviar}
                        onChange={e => onFilterChange({ podeEnviar: e.target.value })}
                        style={{
                            width: '100%',
                            height: '44px',
                            boxSizing: 'border-box',
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1.5px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '10px',
                            padding: '0 0.75rem',
                            color: '#f8fafc',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all" style={{ background: '#0f172a', color: '#fff' }}>Todos</option>
                        <option value="true" style={{ background: '#0f172a', color: '#34d399' }}>Ativos</option>
                        <option value="false" style={{ background: '#0f172a', color: '#f87171' }}>Bloqueados</option>
                    </select>
                </div>

                {/* Botão "Mais Opções" (Filtros Avançados) */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(prev => !prev)}
                        style={{
                            height: '44px',
                            boxSizing: 'border-box',
                            background: showAdvanced ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            border: showAdvanced ? '1.5px solid rgba(99, 102, 241, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.15)',
                            color: showAdvanced ? '#a5b4fc' : '#cbd5e1',
                            borderRadius: '10px',
                            padding: '0 1.1rem',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            position: 'relative',
                            transition: 'all 0.2s ease'
                        }}
                        title="Alternar exibição de filtros avançados"
                    >
                        <span>🎛️</span>
                        <span>{showAdvanced ? 'Menos Opções' : 'Mais Opções'}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{showAdvanced ? '▲' : '▼'}</span>

                        {hasActiveAdvancedFilters && !showAdvanced && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#10b981',
                                border: '2px solid #0f172a'
                            }} />
                        )}
                    </button>
                </div>

                {/* Botão de Filtrar Principal */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        style={{
                            height: '44px',
                            boxSizing: 'border-box',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                            border: '1.5px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            borderRadius: '10px',
                            padding: '0 1.4rem',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ⚡ Filtrar
                    </button>
                </div>
            </div>

            {/* Painel Expansível de Opções Avançadas */}
            {showAdvanced && (
                <div style={{
                    marginTop: '0.2rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px dashed rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1.2fr 1.2fr auto',
                    gap: '1rem',
                    alignItems: 'flex-end',
                    animation: 'fadeIn 0.2s ease-in-out'
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.06em' }}>
                            ⏰ JANELA 24H
                        </label>
                        <select
                            value={janelaAberta}
                            onChange={e => onFilterChange({ janelaAberta: e.target.value })}
                            style={{
                                width: '100%',
                                background: 'rgba(30, 41, 59, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '0.5rem 0.65rem',
                                color: '#f8fafc',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all" style={{ background: '#0f172a', color: '#fff' }}>Todas</option>
                            <option value="true" style={{ background: '#0f172a', color: '#34d399' }}>Aberta</option>
                            <option value="false" style={{ background: '#0f172a', color: '#94a3b8' }}>Fechada</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.06em' }}>
                            💬 INTERAÇÃO
                        </label>
                        <select
                            value={semMensagens}
                            onChange={e => onFilterChange({ semMensagens: e.target.value })}
                            style={{
                                width: '100%',
                                background: 'rgba(30, 41, 59, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '0.5rem 0.65rem',
                                color: '#f8fafc',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all" style={{ background: '#0f172a', color: '#fff' }}>Todos</option>
                            <option value="true" style={{ background: '#0f172a', color: '#fbbf24' }}>Sem Mensagens</option>
                            <option value="false" style={{ background: '#0f172a', color: '#60a5fa' }}>Com Mensagens</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.06em' }}>
                            📅 DATA INÍCIO
                        </label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={e => onFilterChange({ dateStart: e.target.value })}
                            style={{
                                width: '100%',
                                background: 'rgba(30, 41, 59, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.65rem',
                                color: '#f8fafc',
                                fontSize: '0.8rem',
                                colorScheme: 'dark',
                                fontWeight: 600
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.06em' }}>
                            📅 DATA FIM
                        </label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={e => onFilterChange({ dateEnd: e.target.value })}
                            style={{
                                width: '100%',
                                background: 'rgba(30, 41, 59, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.65rem',
                                color: '#f8fafc',
                                fontSize: '0.8rem',
                                colorScheme: 'dark',
                                fontWeight: 600
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleClearFilters}
                        style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            borderRadius: '8px',
                            padding: '0.5rem 0.9rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        🔄 Limpar
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeadFilterBar;

import React from 'react';
import { TAIL_OPTIONS, inputStyle } from './constants';

const LogsActionBar = ({
    dayPickerRef,
    dayPickerOpen,
    setDayPickerOpen,
    dayButtonLabel,
    handleSelectDay,
    selectedDay,
    loadingDays,
    availableDays,
    tail,
    setTail,
    handleLoadLogs,
    loading,
    loadButtonLabel,
    setShowPasteModal,
    handleClearView,
    totalLogCount
}) => {
    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.3)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem'
        }}>
            {/* Dropdown de dia com log real */}
            <div style={{ position: 'relative' }} ref={dayPickerRef}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Dia</label>
                <button
                    onClick={() => setDayPickerOpen((v) => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)',
                        color: '#c4b5fd', padding: '0.6rem 1rem', borderRadius: '10px', fontWeight: 700,
                        cursor: 'pointer', fontSize: '0.85rem'
                    }}
                >
                    📅 {dayButtonLabel} <span style={{ fontSize: '0.7rem' }}>▾</span>
                </button>

                {dayPickerOpen && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: '0.4rem',
                        background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.5)', minWidth: '220px', zIndex: 20,
                        maxHeight: '320px', overflowY: 'auto'
                    }}>
                        <div
                            onClick={() => handleSelectDay(null)}
                            style={{
                                padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                                color: !selectedDay ? '#c4b5fd' : '#e2e8f0', fontWeight: !selectedDay ? 700 : 500,
                                borderBottom: '1px solid rgba(255,255,255,0.06)'
                            }}
                        >
                            Últimas N linhas
                        </div>
                        {loadingDays ? (
                            <div style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>Verificando dias com log...</div>
                        ) : availableDays.length === 0 ? (
                            <div style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>Nenhum dia com log encontrado nos últimos 30 dias.</div>
                        ) : (
                            availableDays.map((d) => (
                                <div
                                    key={d.date}
                                    onClick={() => handleSelectDay(d.date)}
                                    style={{
                                        padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                                        display: 'flex', justifyContent: 'space-between', gap: '0.75rem',
                                        color: selectedDay === d.date ? '#c4b5fd' : '#e2e8f0',
                                        fontWeight: selectedDay === d.date ? 700 : 500,
                                    }}
                                >
                                    <span>{d.date_display}</span>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{d.count.toLocaleString('pt-BR')}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {!selectedDay && (
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Linhas por container</label>
                    <select value={tail} onChange={(e) => setTail(parseInt(e.target.value))} style={{ ...inputStyle, width: 'auto' }}>
                        {TAIL_OPTIONS.map((n) => <option key={n} value={n} style={{ background: '#0f172a' }}>{n.toLocaleString('pt-BR')}</option>)}
                    </select>
                </div>
            )}

            <button
                onClick={handleLoadLogs}
                disabled={loading}
                style={{
                    background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.25rem',
                    borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    marginTop: '1.1rem'
                }}
            >
                🔄 {loading ? 'Carregando...' : loadButtonLabel}
            </button>

            <span style={{ color: 'rgba(255,255,255,0.1)', marginTop: '1.1rem' }}>|</span>

            <button
                onClick={() => setShowPasteModal(true)}
                style={{
                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '1.1rem'
                }}
            >
                📋 Colar manualmente
            </button>

            <button
                onClick={handleClearView}
                title="Limpa apenas a visualização atual (não apaga os logs reais dos containers)"
                style={{
                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '1.1rem'
                }}
            >
                🗑️ Limpar
            </button>

            <button
                disabled
                title="Excluir os logs de verdade exigiria acesso de escrita aos arquivos de log do Docker no host — não habilitado por segurança nesta versão."
                style={{
                    background: 'transparent', color: '#f87171', border: 'none',
                    padding: '0.6rem 0.5rem', fontWeight: 600, cursor: 'not-allowed', marginTop: '1.1rem',
                    opacity: 0.5, fontSize: '0.85rem'
                }}
            >
                🗑️ Apagar log no servidor
            </button>

            <div
                style={{ marginLeft: 'auto', marginTop: '1.1rem', fontSize: '0.8rem', color: '#94a3b8' }}
                title="Total real nos containers nos últimos 30 dias — não muda quando você exclui linhas apenas da visualização abaixo."
            >
                {totalLogCount.toLocaleString('pt-BR')} linhas nos containers (30 dias)
            </div>
        </div>
    );
};

export default LogsActionBar;

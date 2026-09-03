import React from 'react';

export default function PipelineSummaryBar({ metrics }) {
    if (!metrics) return null;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
            {/* Duração Total */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ⏱️ Duração Total
                </span>
                <span style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 800 }}>
                    {metrics.totalDurationFormatted || '--'}
                </span>
            </div>

            {/* Consumo de Tokens */}
            <div data-testid="summary-tokens" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💎 Tokens
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 800 }}>
                        {metrics.totalTokens.toLocaleString()}
                    </span>
                    {metrics.fromSemanticCache && metrics.totalTokens === 0 ? (
                        <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }} title={metrics.cacheSimilarityPct ? `Resposta servida pelo Cache Semântico com ${metrics.cacheSimilarityPct} de similaridade!` : 'Resposta servida pelo Cache Semântico com Custo Zero!'}>
                            <span>⚡</span>
                            <span>{metrics.cacheSimilarityPct ? `${metrics.cacheSimilarityPct} Cache Semântico` : 'Cache Semântico'}</span>
                        </span>
                    ) : metrics.isPartialCache ? (
                        <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800
                        }} title="Cache Semântico pré-resolveu dúvidas homologadas">
                            ⚡ Cache Parcial
                        </span>
                    ) : metrics.cachedTokens > 0 && (
                        <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800
                        }} title={`${metrics.cachedTokens.toLocaleString()} tokens em cache`}>
                            {metrics.cacheHitPercentage}% Cache
                        </span>
                    )}
                </div>
            </div>

            {/* Custo Total */}
            <div data-testid="summary-cost" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💰 Custo Total
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', color: '#fbbf24', fontWeight: 800 }}>
                        R$ {metrics.totalCost > 0 ? metrics.totalCost.toFixed(4) : '0,00'}
                    </span>
                    {metrics.fromSemanticCache && metrics.totalCost <= 0.0001 ? (
                        <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800
                        }} title="Custo de LLM R$ 0,00 garantido pelo Cache Semântico">
                            Custo Zero
                        </span>
                    ) : metrics.isPartialCache ? (
                        <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }} title="Perguntas pré-resolvidas no Cache Semântico + Complementação por IA">
                            <span>⚡</span>
                            <span>Cache Parcial</span>
                        </span>
                    ) : null}
                    {metrics.cachedSavingsFormatted && !metrics.fromSemanticCache && (
                        <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                        }} title={`Economia estimada com Prompt Caching (-50%): ${metrics.cachedSavingsFormatted}`}>
                            <span>⚡</span>
                            <span>Economia: {metrics.cachedSavingsFormatted}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Status do Evento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🏷️ Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        background: metrics.statusInfo.bg,
                        color: metrics.statusInfo.color,
                        border: `1px solid ${metrics.statusInfo.color}33`,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        <span>{metrics.statusInfo.icon}</span>
                        <span>{metrics.statusInfo.label}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

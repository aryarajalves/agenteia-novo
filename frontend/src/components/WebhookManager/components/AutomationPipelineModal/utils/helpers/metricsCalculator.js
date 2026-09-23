import { formatDuration } from './dateAndDuration';

/**
 * Calcula estatísticas agregadas e métricas da pipeline.
 */
export function calculatePipelineMetrics(steps, event) {
    let totalTokens = 0;
    let cachedTokens = 0;
    let totalCost = 0;
    let errorCount = 0;
    let aiCount = 0;
    let toolsCount = 0;
    let cacheCount = 0;
    let fromSemanticCache = false;
    let isPartialCache = false;
    let cacheSimilarityPct = null;

    steps.forEach(s => {
        const meta = s.metadata || {};
        const title = (s.step || s.title || '').toLowerCase();

        // 1. Identificar se houve HIT TOTAL do cache semântico (custo zero real)
        const isTotalHit = meta.from_semantic_cache === true || 
            title.includes('⚡ cache semântico') || 
            title.includes('resposta do cache semântico');

        // 2. Identificar se houve HIT PARCIAL
        const isPartialHit = meta.from_semantic_cache === 'partial' || 
            title.includes('cache semântico parcial') || 
            title.includes('dúvidas pré-resolvidas');

        // 3. Identificar se é apenas uma etapa de verificação / Miss
        const isMiss = meta.from_semantic_cache === false || 
            title.includes('verificação de cache semântico');

        if (isTotalHit && !isPartialHit && !isMiss) {
            fromSemanticCache = true;
            cacheCount++;
            if (meta.similarity_pct) {
                cacheSimilarityPct = meta.similarity_pct;
            }
        } else if (isPartialHit) {
            isPartialCache = true;
            cacheCount++;
            if (meta.similarity_pct) {
                cacheSimilarityPct = meta.similarity_pct;
            }
        } else if (title.includes('cache semântico') || title.includes('cache semantico')) {
            // Passo de consulta/verificação que não atingiu o limiar
            cacheCount++;
        }

        if (s.category === 'errors' || s.title?.includes('❌')) errorCount++;
        if (s.category === 'ai') aiCount++;
        if (s.category === 'tools') toolsCount++;

        if (s.metadata) {
            if (s.metadata.cost) totalCost += Number(s.metadata.cost) || 0;
            if (s.metadata.usage) {
                const u = s.metadata.usage;
                totalTokens += Number(u.total_tokens || u.prompt_tokens + u.completion_tokens) || 0;
                cachedTokens += Number(u.cached_tokens) || 0;
            }
        }
    });

    // Salvaguarda financeira estrita: se houve custo de IA (> 0) ou tokens gerados por LLM,
    // a resposta NÃO foi servida com custo zero pelo cache!
    if (totalCost > 0.0001 || totalTokens > 0) {
        fromSemanticCache = false;
    }

    // Calcular tempo total
    let totalDurationMs = null;
    if (steps.length > 1) {
        const stepSum = steps.reduce((acc, s) => acc + (s.durationMs || 0), 0);
        if (stepSum > 0) {
            totalDurationMs = stepSum;
        }
    }

    const cacheHitPercentage = (totalTokens > 0 && cachedTokens > 0) 
        ? Math.round((cachedTokens / totalTokens) * 100) 
        : 0;

    // Economia estimada pelo desconto de 50% em tokens cacheados da OpenAI
    const cachedSavingsUsd = cachedTokens * (0.15 / 1_000_000);
    const cachedSavingsBrl = cachedSavingsUsd * 5.30;
    const cachedSavingsFormatted = cachedSavingsBrl > 0 
        ? (cachedSavingsBrl < 0.01 ? '< R$ 0,01' : `R$ ${cachedSavingsBrl.toFixed(2)}`) 
        : null;

    let statusLabel = 'Concluído';
    let statusColor = '#10b981';
    let statusBg = 'rgba(16, 185, 129, 0.1)';
    let statusIcon = '🟢';

    const status = (event?.status || '').toLowerCase();
    if (status === 'processing' || status === 'waiting' || status === 'pending') {
        statusLabel = 'Em Processamento';
        statusColor = '#6366f1';
        statusBg = 'rgba(99, 102, 241, 0.1)';
        statusIcon = '⚙️';
    } else if (status === 'error' || errorCount > 0) {
        statusLabel = 'Falha no Envio';
        statusColor = '#ef4444';
        statusBg = 'rgba(239, 68, 68, 0.1)';
        statusIcon = '🔴';
    } else if (status === 'ignored' || status.includes('ignored')) {
        statusLabel = 'Ignorado';
        statusColor = '#f59e0b';
        statusBg = 'rgba(245, 158, 11, 0.1)';
        statusIcon = '🟡';
    } else if (status === 'canceled') {
        statusLabel = 'Cancelado';
        statusColor = '#94a3b8';
        statusBg = 'rgba(148, 163, 184, 0.1)';
        statusIcon = '⚪';
    }

    return {
        totalDurationMs,
        totalDurationFormatted: formatDuration(totalDurationMs),
        totalTokens,
        cachedTokens,
        cacheHitPercentage,
        cachedSavingsBrl,
        cachedSavingsFormatted,
        totalCost,
        errorCount,
        categoryCounts: {
            all: steps.length,
            ai: aiCount,
            tools: toolsCount,
            errors: errorCount,
            cache: cacheCount
        },
        fromSemanticCache,
        isPartialCache,
        cacheSimilarityPct,
        cacheCount,
        statusInfo: {
            label: statusLabel,
            color: statusColor,
            bg: statusBg,
            icon: statusIcon
        }
    };
}

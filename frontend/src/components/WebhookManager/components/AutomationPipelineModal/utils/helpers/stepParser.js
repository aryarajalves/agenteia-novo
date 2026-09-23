import { parseDate, formatDuration } from './dateAndDuration';
import { getSmartDiagnostic, getStepCategory } from './diagnosticsAndCategories';

/**
 * Converte a string JSON de processing_steps em uma lista estruturada de passos com latência e diagnósticos.
 */
export function parsePipelineSteps(event) {
    if (!event) return [];
    
    let rawSteps = [];
    try {
        rawSteps = JSON.parse(event.processing_steps || '[]');
    } catch (e) {
        console.error('Erro ao parsear steps:', e);
    }

    const steps = rawSteps.map((s, idx) => {
        const currentDate = s.timestamp ? parseDate(s.timestamp) : null;
        let durationMs = null;

        // 1. Se houver duration_ms explícito no metadata ou no step, usa diretamente (máxima precisão do backend)
        if (s.metadata?.duration_ms || s.duration_ms) {
            durationMs = Number(s.metadata?.duration_ms || s.duration_ms);
        } else if (currentDate && idx < rawSteps.length - 1 && rawSteps[idx + 1]?.timestamp) {
            // 2. A duração do passo atual é o tempo decorrido até o próximo passo ser registrado
            const nextDate = parseDate(rawSteps[idx + 1].timestamp);
            const diff = nextDate.getTime() - currentDate.getTime();
            if (diff >= 0 && diff < 3600000) {
                durationMs = diff;
            }
        }

        const category = getStepCategory(s);
        const isErrorStep = category === 'errors';
        const diagnostic = isErrorStep ? getSmartDiagnostic(s.detail || '', s.step || '') : null;

        const isExtractStep = s.step?.includes("Conteúdo Extraído");
        const titleLower = (s.step || '').toLowerCase();
        const isHit = s.metadata?.from_semantic_cache === true || 
            titleLower.includes('⚡ cache semântico') || 
            titleLower.includes('resposta do cache');
        const isPartial = s.metadata?.from_semantic_cache === 'partial' || 
            titleLower.includes('cache semântico parcial');
        const isMiss = s.metadata?.from_semantic_cache === false || 
            titleLower.includes('verificação de cache semântico');

        const isSemanticCache = Boolean(isHit || isPartial || titleLower.includes('cache semântico') || titleLower.includes('cache semantico'));
        let metadata = s.metadata ? { ...s.metadata } : null;
        if (isExtractStep && (!metadata || !metadata.media_url) && event?.link) {
            const inferredType = (event?.message_type || '').toLowerCase() || (/\.(jpg|jpeg|png|webp|gif|bmp|svg)($|\?)/i.test(event?.link) ? 'image' : 'audio');
            metadata = {
                ...(metadata || {}),
                media_url: event.link,
                media_type: metadata?.media_type || inferredType
            };
        }

        const stepIcon = (isHit || isPartial) ? '⚡' : (
            isMiss ? '🔍' : (
                s.step?.includes('✅') ? '✔️' : 
                s.step?.includes('❌') ? '❌' : 
                s.step?.includes('🤖') ? '🤖' : 
                s.step?.includes('🔍') ? '🔍' : 
                s.step?.includes('📥') ? '📥' : 
                s.step?.includes('🧠') ? '🧠' : 
                s.step?.includes('🛠️') ? '🛠️' : '⚡'
            )
        );

        return {
            id: idx,
            title: s.step || 'Passo da Automação',
            time: currentDate ? currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--',
            content: s.detail || '',
            icon: stepIcon,
            metadata,
            durationMs,
            durationFormatted: formatDuration(durationMs),
            diagnostic,
            category,
            isSemanticCache
        };
    });

    // Se tiver resposta do agente e não estiver nos steps, adicionar como passo final
    if (event.agent_response && !steps.some(s => s.title.includes('Resposta gerada') || s.title.includes('Resposta Final Enviada') || s.title.includes('Resposta do Cache Semântico'))) {
        const updatedDate = event.updated_at ? parseDate(event.updated_at) : null;
        const lastStepDate = steps.length > 0 && rawSteps[rawSteps.length - 1]?.timestamp ? parseDate(rawSteps[rawSteps.length - 1].timestamp) : null;
        let finalDurationMs = null;
        if (updatedDate && lastStepDate) {
            const diff = updatedDate.getTime() - lastStepDate.getTime();
            if (diff >= 0 && diff < 3600000) finalDurationMs = diff;
        }

        // Atribui o tempo restante até updated_at para o último passo de processamento que gerou a resposta
        if (steps.length > 0 && steps[steps.length - 1].durationMs === null && finalDurationMs !== null) {
            steps[steps.length - 1].durationMs = finalDurationMs;
            steps[steps.length - 1].durationFormatted = formatDuration(finalDurationMs);
        }

        steps.push({
            id: 'final-resp',
            title: '✅ Resposta Final Enviada',
            time: updatedDate ? updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--',
            content: event.agent_response,
            icon: '🤖',
            durationMs: null,
            durationFormatted: null,
            category: 'ai',
            diagnostic: null,
            isSemanticCache: false
        });
    }

    return steps;
}

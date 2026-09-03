/**
 * Helper para garantir que a data seja tratada como UTC se não tiver timezone.
 */
export function parseDate(dateStr) {
    try {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) return dateStr;
        
        const normalized = (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:?\d{2}$/)) 
            ? dateStr 
            : dateStr + 'Z';
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch {
        return new Date();
    }
}

/**
 * Formata duração em milissegundos para representação amigável (ex: 350ms, 1.8s, 2m 10s).
 */
export function formatDuration(ms) {
    if (ms === null || ms === undefined || isNaN(ms)) return null;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = Math.round(seconds % 60);
    return `${minutes}m ${remainingSecs}s`;
}

/**
 * Analisador semântico de erros para fornecer diagnóstico e dicas acionáveis de resolução.
 */
export function getSmartDiagnostic(content, title = '') {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('connection refused') || text.includes('errno 111') || text.includes('econnrefused')) {
        return {
            type: 'connection_refused',
            title: 'Recusa de Conexão (Serviço Inacessível)',
            tip: 'O serviço de destino (ZapVoice/WhatsApp) recusou a conexão. Se estiver rodando localmente no Docker, configure a URL como "http://host.docker.internal:8000" em vez de "localhost".',
            severity: 'error',
            action: 'Verificar URL da Integração'
        };
    }

    if (text.includes('401') || text.includes('unauthorized') || text.includes('invalid api key') || text.includes('chave inválida') || text.includes('incorrect api key')) {
        return {
            type: 'auth_error',
            title: 'Falha de Autenticação / Token Inválido',
            tip: 'A chave de API ou token de autorização fornecido é inválido ou expirou. Verifique as credenciais no arquivo .env ou no modal de configuração da integração.',
            severity: 'error',
            action: 'Revisar Credenciais'
        };
    }

    if (text.includes('429') || text.includes('insufficient_quota') || text.includes('rate_limit') || text.includes('quota exceeded') || text.includes('exceeded your current quota')) {
        return {
            type: 'quota_error',
            title: 'Cota de IA Esgotada ou Limite de Taxa',
            tip: 'O saldo de créditos do provedor de IA terminou ou o limite de requisições simultâneas por minuto foi atingido. Verifique o saldo no painel da OpenAI/Anthropic.',
            severity: 'warning',
            action: 'Checar Saldo do Provedor'
        };
    }

    if (text.includes('timeout') || text.includes('timed out') || text.includes('timed-out') || text.includes('60s timeout')) {
        return {
            type: 'timeout_error',
            title: 'Tempo Limite Excedido (Timeout)',
            tip: 'A conexão demorou mais tempo que o permitido para responder. O servidor de destino pode estar em sobrecarga temporária ou enfrentando lentidão.',
            severity: 'warning',
            action: 'Testar Conectividade'
        };
    }

    if (text.includes('404') || text.includes('not found')) {
        return {
            type: 'not_found',
            title: 'Recurso ou Rota Não Encontrada (404)',
            tip: 'A URL do webhook ou endpoint acessado não existe no servidor de destino. Verifique os caminhos configurados.',
            severity: 'error',
            action: 'Revisar Rota'
        };
    }

    return null;
}

/**
 * Classifica o passo em uma categoria para filtros da timeline baseando-se estritamente no TÍTULO da etapa.
 */
export function getStepCategory(step) {
    const title = (step.step || step.title || '').toLowerCase();
    
    // 1. Verificação estrita de erros no título da etapa
    if (
        title.includes('❌') || 
        title.includes('🛑') || 
        title.includes('falha') || 
        title.includes('erro') || 
        title.includes('interrompido') || 
        title.includes('cancelad')
    ) {
        return 'errors';
    }
    
    // 2. Etapas de IA e Decisão
    if (
        title.includes('🧠') || 
        title.includes('🤖') || 
        title.includes('⚡') || 
        title.includes('pre-router') || 
        title.includes('agente') || 
        title.includes('rag') || 
        title.includes('saudação') || 
        title.includes('raio-x') || 
        title.includes('intenção') || 
        title.includes('resposta') || 
        title.includes('decisão') ||
        title.includes('anúncio') ||
        title.includes('memória') ||
        title.includes('contexto') ||
        title.includes('conectando') ||
        title.includes('mensagem enviada')
    ) {
        return 'ai';
    }
    
    // 3. Etapas de Ferramentas, Mídias, Leads e Dados
    if (
        title.includes('🛠️') || 
        title.includes('ferramenta') || 
        title.includes('variáveis') || 
        title.includes('💾') || 
        title.includes('🏷️') || 
        title.includes('lead') || 
        title.includes('etiqueta') || 
        title.includes('zapvoice') || 
        title.includes('mídia') || 
        title.includes('áudio') || 
        title.includes('imagem') || 
        title.includes('debounce') || 
        title.includes('💰') || 
        title.includes('financeiro') ||
        title.includes('status') ||
        title.includes('contato')
    ) {
        return 'tools';
    }

    return 'ai';
}

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

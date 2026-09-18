/**
 * Despacha os passos de um funil por dúvida sequencialmente no chat,
 * respeitando os delays configurados para cada passo e mantendo
 * o feedback visual de digitação (typing) durante a espera de cada passo.
 * 
 * @param {Object} params
 * @param {Array} params.funnelSteps - Lista de passos do funil com delay_seconds
 * @param {string} params.rawContent - Conteúdo consolidado retornado pelo backend
 * @param {Object} params.baseMetrics - Métricas de consumo e custo do turno
 * @param {Object} params.baseDebug - Informações de debug/raio-x
 * @param {boolean} params.baseViolations - Violações detectadas
 * @param {boolean} params.isErrorMsg - Flag de erro
 * @param {string|null} params.systemErrorDetail - Detalhes de erro do sistema
 * @param {Object} params.data - Resposta original da API
 * @param {Function} params.appendMessage - Função para adicionar mensagem à conversa
 * @param {Function} [params.setLoadingState] - Controle do indicador visual de digitação
 * @param {Function} [params.delayFn] - Função de delay customizável para testes (default setTimeout)
 */
export const dispatchFunnelStepsSequentially = async ({
    funnelSteps,
    rawContent,
    baseMetrics,
    baseDebug,
    baseViolations = false,
    isErrorMsg = false,
    systemErrorDetail = null,
    data,
    appendMessage,
    setLoadingState,
    delayFn = (ms) => new Promise(resolve => setTimeout(resolve, ms))
}) => {
    if (!Array.isArray(funnelSteps) || funnelSteps.length === 0) return;

    const totalSteps = funnelSteps.length;

    for (let i = 0; i < totalSteps; i++) {
        const step = funnelSteps[i];
        const delaySeconds = Math.max(0, parseInt(step.delay_seconds || 0, 10));

        // 1. Mantém o loading ativo enquanto espera o delay configurado para este passo
        if (delaySeconds > 0) {
            if (setLoadingState) setLoadingState(true);
            await delayFn(delaySeconds * 1000);
        }

        const isLastStep = i === totalSteps - 1;

        // 2. Extrai o conteúdo textual do passo
        let stepContent = step.content || '';
        if (step.type === 'audio') {
            stepContent = step.transcription || 'Mensagem de áudio gravado (PTT)';
        } else if (!stepContent && ['image', 'video', 'document'].includes(step.type)) {
            stepContent = `Arquivo de ${step.type}`;
        }

        // 3. Monta o objeto de mensagem individual
        const stepMsg = {
            role: 'assistant',
            content: stepContent,
            fullContent: rawContent,
            isLink: false,
            isSplit: i > 0,
            funnel_step: step,
            from_question_funnel: true,
            // As métricas e dados de debug do funil são vinculados ao último passo para renderizar a MetaBar
            debug: isLastStep ? baseDebug : undefined,
            metrics: isLastStep ? baseMetrics : null,
            violations: i === 0 ? baseViolations : false,
            isError: isErrorMsg,
            systemError: isLastStep ? systemErrorDetail : null,
            model_used: isLastStep ? (data?.model_used || 'question-funnel') : null,
            tool_calls: isLastStep ? (data?.tool_calls || null) : null,
            created_at: new Date().toISOString()
        };

        // 4. Adiciona a mensagem individual do passo
        appendMessage(stepMsg);

        // Se ainda restarem passos a serem enviados, garante que o loading continua ativo
        if (!isLastStep && setLoadingState) {
            setLoadingState(true);
        }
    }
};

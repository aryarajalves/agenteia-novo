/**
 * Utilitários para contagem e estimativa de tokens em prompts do ChatPlayground.
 */

export const estimateTokens = (text) => {
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    // Estimativa padrão para modelos GPT/Claude em PT-BR (aprox. 3.8 caracteres por token)
    return Math.max(1, Math.ceil(trimmed.length / 3.8));
};

export const formatTokenCount = (count) => {
    return Number(count || 0).toLocaleString('pt-BR');
};

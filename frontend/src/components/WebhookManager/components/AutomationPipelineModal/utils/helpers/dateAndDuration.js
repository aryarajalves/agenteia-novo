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

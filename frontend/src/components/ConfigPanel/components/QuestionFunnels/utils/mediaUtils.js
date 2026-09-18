import { API_URL } from '../../../../../config';

/**
 * Normaliza URLs de mídia (áudios, imagens, vídeos) para garantir que
 * hosts internos do Docker (como http://minio:9000) sejam convertidos
 * em rotas públicas acessíveis pelo navegador e por APIs externas.
 */
export const resolveMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const cleanUrl = url.trim();

    // Se contiver host interno do MinIO (Docker network), converte para rota pública da API
    if (cleanUrl.includes('minio:9000') || cleanUrl.includes('minio/zap-voice')) {
        const parts = cleanUrl.split('?')[0].split('/');
        const filename = parts[parts.length - 1];
        if (filename) {
            const base = (API_URL || 'http://localhost:8002').replace(/\/$/, '');
            return `${base}/api/question-funnels/media/${filename}`;
        }
    }

    // Se for caminho relativo (/api/... ou /uploads/...)
    if (cleanUrl.startsWith('/')) {
        const base = (API_URL || 'http://localhost:8002').replace(/\/$/, '');
        return `${base}${cleanUrl}`;
    }

    return cleanUrl;
};

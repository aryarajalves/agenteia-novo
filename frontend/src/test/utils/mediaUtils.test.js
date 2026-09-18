import { describe, it, expect, vi } from 'vitest';
import { resolveMediaUrl } from '../../components/ConfigPanel/components/QuestionFunnels/utils/mediaUtils';

describe('mediaUtils - resolveMediaUrl', () => {
    it('retorna string vazia para valores nulos ou inválidos', () => {
        expect(resolveMediaUrl(null)).toBe('');
        expect(resolveMediaUrl(undefined)).toBe('');
        expect(resolveMediaUrl('')).toBe('');
    });

    it('converte URLs internas do minio:9000 para rota pública da API', () => {
        const internalMinio = 'http://minio:9000/zap-voice/funnel-media/funnel_b065c649-edf5-4379-b517-013c85a91b63.ogg';
        const resolved = resolveMediaUrl(internalMinio);
        
        expect(resolved).not.toContain('minio:9000');
        expect(resolved).toContain('/api/question-funnels/media/funnel_b065c649-edf5-4379-b517-013c85a91b63.ogg');
    });

    it('converte caminhos relativos adicionando a base da API', () => {
        const relative = '/uploads/sample.mp3';
        const resolved = resolveMediaUrl(relative);
        
        expect(resolved).toMatch(/^https?:\/\/.*\/uploads\/sample\.mp3$/);
    });

    it('mantém URLs públicas externas inalteradas', () => {
        const external = 'https://s3.amazonaws.com/my-bucket/audio.mp3';
        expect(resolveMediaUrl(external)).toBe(external);
    });
});

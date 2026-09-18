import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImportChat } from '../components/WebhookManager/hooks/useImportChat';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn()
    }
}));

vi.mock('../components/WebhookManager/utils/helpers', () => ({
    showToast: vi.fn()
}));

describe('useImportChat Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('inicializa com estado padrão correto', () => {
        const { result } = renderHook(() => useImportChat({ webhook: { id: 10 } }));
        expect(result.current.importProgress.isOpen).toBe(false);
        expect(result.current.importProgress.percentage).toBe(0);
        expect(result.current.importProgress.done).toBe(false);
        expect(result.current.isStartingImport).toBe(false);
    });

    it('handleImportChat abre modal e envia requisição POST para iniciar importação', async () => {
        api.post.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, message: 'Importação iniciada' })
        });

        const { result } = renderHook(() => useImportChat({ webhook: { id: 10 } }));

        await act(async () => {
            await result.current.handleImportChat({ id: 10 });
        });

        expect(api.post).toHaveBeenCalledWith('/webhooks/10/leads/import-zapjords');
        expect(result.current.importProgress.isOpen).toBe(true);
        expect(result.current.importProgress.status).toContain('Conectando ao ZapJords');
    });

    it('handleImportWsMessage atualiza progresso com mensagem WebSocket', () => {
        const onFinish = vi.fn();
        const { result } = renderHook(() => useImportChat({ webhook: { id: 10 }, onImportFinished: onFinish }));

        act(() => {
            result.current.handleImportWsMessage({
                type: 'chat_import_progress',
                webhook_id: 10,
                current: 50,
                total: 100,
                percentage: 50,
                status: 'Processando...'
            });
        });

        expect(result.current.importProgress.current).toBe(50);
        expect(result.current.importProgress.percentage).toBe(50);
        expect(result.current.importProgress.done).toBe(false);

        // Mensagem de conclusão
        act(() => {
            result.current.handleImportWsMessage({
                type: 'chat_import_completed',
                webhook_id: 10,
                current: 100,
                total: 100,
                percentage: 100,
                done: true,
                status: 'Concluído com sucesso'
            });
        });

        expect(result.current.importProgress.done).toBe(true);
        expect(result.current.importProgress.percentage).toBe(100);
        expect(onFinish).toHaveBeenCalled();
    });

    it('cancelImport envia POST de cancelamento e atualiza estado', async () => {
        api.post.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true })
        });

        const onFinish = vi.fn();
        const { result } = renderHook(() => useImportChat({ webhook: { id: 10 }, onImportFinished: onFinish }));

        await act(async () => {
            await result.current.cancelImport();
        });

        expect(api.post).toHaveBeenCalledWith('/webhooks/10/leads/cancel-import');
        expect(result.current.importProgress.cancelled).toBe(true);
        expect(result.current.importProgress.done).toBe(true);
        expect(onFinish).toHaveBeenCalled();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMedia } from '../../../components/ChatPlayground/hooks/useChatMedia';
import { useChatSession } from '../../../components/ChatPlayground/hooks/useChatSession';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        upload: vi.fn()
    }
}));

describe('useChat Modular Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useChatMedia Hook', () => {
        it('deve inicializar com estados vazios e permitir remoção de imagem', () => {
            const showToast = vi.fn();
            const { result } = renderHook(() => useChatMedia({ showToast }));

            expect(result.current.selectedImage).toBeNull();
            expect(result.current.imagePreview).toBeNull();
            expect(result.current.isUploading).toBe(false);

            act(() => {
                result.current.setSelectedImage(new File(['dummy'], 'test.png', { type: 'image/png' }));
                result.current.setImagePreview('data:image/png;base64,...');
            });

            expect(result.current.selectedImage).not.toBeNull();
            expect(result.current.imagePreview).toBe('data:image/png;base64,...');

            act(() => {
                result.current.handleRemoveImage();
            });

            expect(result.current.selectedImage).toBeNull();
            expect(result.current.imagePreview).toBeNull();
        });

        it('deve fazer upload de imagem com sucesso', async () => {
            api.upload.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ image_url: 'https://storage.test/img.png' })
            });

            const showToast = vi.fn();
            const { result } = renderHook(() => useChatMedia({ showToast }));

            const file = new File(['dummy'], 'foto.jpg', { type: 'image/jpeg' });
            let url;
            await act(async () => {
                url = await result.current.uploadImage(file);
            });

            expect(url).toBe('https://storage.test/img.png');
            expect(api.upload).toHaveBeenCalledWith('/upload-image', expect.any(FormData));
        });
    });

    describe('useChatSession Hook', () => {
        it('deve resetar a sessão e limpar histórico e relatórios', () => {
            const setSessionId = vi.fn();
            const setMessages = vi.fn();
            const setBattleMessages = vi.fn();
            const setHasTesterReport = vi.fn();
            const setTesterReport = vi.fn();
            const showToast = vi.fn();

            const { result } = renderHook(() => useChatSession({
                selectedAgentId: 1,
                sessionId: 'session-old',
                setSessionId,
                setMessages,
                setBattleMessages,
                setHasTesterReport,
                setTesterReport,
                setLoading: vi.fn(),
                showToast
            }));

            act(() => {
                result.current.handleReset();
            });

            expect(setSessionId).toHaveBeenCalled();
            expect(setMessages).toHaveBeenCalledWith([]);
            expect(setBattleMessages).toHaveBeenCalledWith([]);
            expect(setHasTesterReport).toHaveBeenCalledWith(false);
            expect(showToast).toHaveBeenCalledWith('Sessão resetada com sucesso!', 'success');
        });

        it('deve carregar histórico da sessão e computar métricas acumuladas', async () => {
            api.get.mockResolvedValueOnce({
                ok: true,
                json: async () => ([
                    { role: 'user', content: 'Olá' },
                    { role: 'assistant', content: 'Oi!', cost: 0.05, tokens: 120 }
                ])
            });

            const setMessages = vi.fn();
            const showToast = vi.fn();
            const setLoading = vi.fn();

            const { result } = renderHook(() => useChatSession({
                selectedAgentId: 1,
                sessionId: 'sess-123',
                setSessionId: vi.fn(),
                setMessages,
                setBattleMessages: vi.fn(),
                setHasTesterReport: vi.fn(),
                setTesterReport: vi.fn(),
                setLoading,
                showToast
            }));

            await act(async () => {
                await result.current.loadSession('sess-123');
            });

            expect(setMessages).toHaveBeenCalled();
            expect(result.current.sessionStats.totalCost).toBe(0.05);
            expect(result.current.sessionStats.totalTokens).toBe(120);
            expect(result.current.sessionStats.responseCount).toBe(1);
            expect(showToast).toHaveBeenCalledWith('Sessão carregada com sucesso!', 'success');
        });
    });
});

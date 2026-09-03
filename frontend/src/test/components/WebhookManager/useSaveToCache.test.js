import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveToCache } from '../../../components/WebhookManager/components/LeadHistoryModal/hooks/useSaveToCache';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
    api: {
        post: vi.fn(),
        put: vi.fn()
    }
}));

describe('useSaveToCache Hook', () => {
    const mockWebhook = { id: 10, agent_id: 36, name: 'Webhook Principal' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve abrir modal de aprovação preenchendo mensagem do usuário e resposta da IA', () => {
        const { result } = renderHook(() => useSaveToCache(mockWebhook));

        const mockEvent = {
            id: 407,
            mensagem: 'obrigado',
            agent_response: 'Por nada! Se precisar de mais alguma coisa, é só chamar.',
            created_at: '2026-08-27T08:52:41'
        };

        act(() => {
            result.current.handleOpenSaveCache(mockEvent);
        });

        expect(result.current.approveCacheModal).toEqual({
            userMsg: 'obrigado',
            msg: { content: 'Por nada! Se precisar de mais alguma coisa, é só chamar.' },
            agentId: 36
        });
    });

    it('deve salvar nova resposta no cache com sucesso', async () => {
        api.post.mockResolvedValue({ ok: true, json: async () => ({ id: 100 }) });
        const { result } = renderHook(() => useSaveToCache(mockWebhook));

        act(() => {
            result.current.handleOpenSaveCache({
                id: 407,
                mensagem: 'obrigado',
                agent_response: 'Por nada! Se precisar de mais alguma coisa, é só chamar.'
            });
        });

        await act(async () => {
            await result.current.handleConfirmSaveCache(
                'obrigado',
                'Por nada! Se precisar de mais alguma coisa, é só chamar.',
                ['valeu', 'obrigada']
            );
        });

        expect(api.post).toHaveBeenCalledWith('/semantic-cache', {
            agent_id: 36,
            user_query: 'obrigado',
            approved_response: 'Por nada! Se precisar de mais alguma coisa, é só chamar.',
            alternate_queries: ['valeu', 'obrigada'],
            similarity_threshold: null
        });
        expect(result.current.approveCacheModal).toBeNull();
    });

    it('não deve abrir modal se o evento for follow-up', () => {
        const { result } = renderHook(() => useSaveToCache(mockWebhook));

        const followUpEvent = {
            id: 404,
            event_type: 'followup',
            mensagem: '[Follow-Up Passo #2]',
            agent_response: '[Template Oficial]: compra_aprovada'
        };

        act(() => {
            result.current.handleOpenSaveCache(followUpEvent);
        });

        expect(result.current.approveCacheModal).toBeNull();
    });
});

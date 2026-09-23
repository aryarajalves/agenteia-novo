import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeadsSelection } from '../../components/WebhookManager/hooks/leads/useLeadsSelection';
import { useLeadsBatchActions } from '../../components/WebhookManager/hooks/leads/useLeadsBatchActions';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn()
    }
}));

vi.mock('../../components/WebhookManager/utils/helpers', () => ({
    showToast: vi.fn()
}));

describe('useLeadsSelection Hook', () => {
    it('deve alternar a seleção de leads individuais (toggleSelectLead)', () => {
        const { result } = renderHook(() => useLeadsSelection({ leads: [{ id: 1 }, { id: 2 }] }));

        expect(result.current.selectedLeads.size).toBe(0);

        act(() => {
            result.current.toggleSelectLead(1);
        });
        expect(result.current.selectedLeads.has(1)).toBe(true);

        act(() => {
            result.current.toggleSelectLead(2);
        });
        expect(result.current.selectedLeads.size).toBe(2);

        act(() => {
            result.current.toggleSelectLead(1);
        });
        expect(result.current.selectedLeads.has(1)).toBe(false);
        expect(result.current.selectedLeads.has(2)).toBe(true);
    });

    it('deve selecionar e desmarcar todos os leads da página (toggleSelectAllLeads)', () => {
        const mockModal = {
            leads: [{ id: 10 }, { id: 20 }, { id: 30 }]
        };
        const { result } = renderHook(() => useLeadsSelection(mockModal));

        act(() => {
            result.current.toggleSelectAllLeads();
        });
        expect(result.current.selectedLeads.size).toBe(3);
        expect(result.current.selectedLeads.has(10)).toBe(true);
        expect(result.current.selectedLeads.has(20)).toBe(true);

        act(() => {
            result.current.toggleSelectAllLeads();
        });
        expect(result.current.selectedLeads.size).toBe(0);
    });

    it('deve limpar todas as seleções (handleClearAllSelectedLeads)', () => {
        const { result } = renderHook(() => useLeadsSelection({ leads: [{ id: 5 }] }));

        act(() => {
            result.current.toggleSelectLead(5);
        });
        expect(result.current.selectedLeads.size).toBe(1);

        act(() => {
            result.current.handleClearAllSelectedLeads();
        });
        expect(result.current.selectedLeads.size).toBe(0);
    });
});

describe('useLeadsBatchActions Hook', () => {
    let mockApi;

    beforeEach(async () => {
        const client = await import('../../api/client');
        mockApi = client.api;
        vi.clearAllMocks();
    });

    it('deve disparar exclusão em lote de leads selecionados', async () => {
        mockApi.delete.mockResolvedValueOnce({ ok: true });
        const fetchLeadsMock = vi.fn();
        const setSelectedLeadsMock = vi.fn();

        const { result } = renderHook(() => useLeadsBatchActions({
            leadsModal: { webhook: { id: 99 }, page: 1, pageSize: 20 },
            selectedLeads: new Set([101, 102]),
            setSelectedLeads: setSelectedLeadsMock,
            fetchLeads: fetchLeadsMock
        }));

        await act(async () => {
            await result.current.handleDeleteSelectedLeads();
        });

        expect(mockApi.delete).toHaveBeenCalledWith(
            '/webhooks/99/leads/batch',
            { lead_ids: [101, 102] }
        );
        expect(setSelectedLeadsMock).toHaveBeenCalled();
        expect(fetchLeadsMock).toHaveBeenCalled();
    });

    it('deve sincronizar contatos com handleSyncAll', async () => {
        mockApi.post.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, message: 'Sincronizado' })
        });
        const fetchLeadsMock = vi.fn();

        const { result } = renderHook(() => useLeadsBatchActions({
            leadsModal: { webhook: { id: 77 } },
            selectedLeads: new Set(),
            setSelectedLeads: vi.fn(),
            fetchLeads: fetchLeadsMock
        }));

        await act(async () => {
            await result.current.handleSyncAll({ id: 77 });
        });

        expect(mockApi.post).toHaveBeenCalledWith('/webhooks/77/leads/sync-all');
        expect(fetchLeadsMock).toHaveBeenCalledWith({ id: 77 });
    });
});

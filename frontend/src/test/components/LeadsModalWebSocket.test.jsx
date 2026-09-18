import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import LeadsModal from '../../components/WebhookManager/components/LeadsModal';
import { useLeads } from '../../components/WebhookManager/hooks/useLeads';

// Mock da api
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ leads: [], total: 0 })
        }),
        post: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ ok: true })
        }),
        delete: vi.fn().mockResolvedValue({
            ok: true,
            status: 204
        })
    }
}));

describe('LeadsModal & useLeads WebSocket Integration', () => {
    let mockWsInstances = [];

    beforeEach(() => {
        mockWsInstances = [];

        class MockWebSocket {
            constructor(url) {
                this.url = url;
                this.close = vi.fn();
                this.onopen = null;
                this.onmessage = null;
                this.onclose = null;
                this.onerror = null;
                mockWsInstances.push(this);
            }
        }

        global.WebSocket = MockWebSocket;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar o badge "Tempo Real" no cabeçalho do LeadsModal', () => {
        const mockWebhook = { id: 10, name: 'Webhook Alpha' };
        render(
            <LeadsModal
                leadsModal={{
                    webhook: mockWebhook,
                    leads: [],
                    total: 12,
                    page: 1,
                    pageSize: 20,
                    loading: false,
                    liveConnected: true
                }}
                onClose={vi.fn()}
                onPageChange={vi.fn()}
                onPageSizeChange={vi.fn()}
                onSyncAll={vi.fn()}
                isSyncing={false}
                onRefresh={vi.fn()}
            />
        );

        expect(screen.getByText(/Tempo Real/i)).toBeInTheDocument();
        expect(screen.getByText(/12\s+contatos identificados/i)).toBeInTheDocument();
    });

    it('deve conectar o WebSocket em /ws/events e atualizar leads silenciosamente ao receber lead_created', async () => {
        const { api } = await import('../../api/client');

        let triggerSetModal;
        function TestHookComponent() {
            const { leadsModal, setLeadsModal } = useLeads();
            triggerSetModal = setLeadsModal;

            return (
                <div>
                    <span data-testid="leads-count">{leadsModal?.leads?.length ?? 0}</span>
                </div>
            );
        }

        render(<TestHookComponent />);

        // Aciona a abertura do modal com o webhook
        act(() => {
            triggerSetModal({
                webhook: { id: 42, name: 'Webhook Teste' },
                leads: [],
                total: 0,
                page: 1,
                pageSize: 20,
                loading: false
            });
        });

        // WebSocket deve ter sido instanciado com a URL correta
        expect(mockWsInstances.length).toBeGreaterThanOrEqual(1);
        const ws = mockWsInstances[mockWsInstances.length - 1];
        expect(ws.url).toContain('/ws/events');

        // Simula evento de novo lead chegando pelo WebSocket
        const incomingMsg = {
            data: JSON.stringify({
                type: 'lead_created',
                webhook_id: 42,
                lead_id: 101,
                telefone: '5511999990001'
            })
        };

        // Dispara mensagem com fake timer para debounce
        vi.useFakeTimers();
        act(() => {
            if (ws.onmessage) ws.onmessage(incomingMsg);
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });
        vi.useRealTimers();

        // api.get deve ter sido chamado para atualizar os leads
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/webhooks/42/leads'));
    });
});

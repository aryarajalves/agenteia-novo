import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutomationPipelineModal from '../../components/WebhookManager/components/AutomationPipelineModal';

vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:5000'
}));

describe('Reproduzir bug do botao atualizar pipeline', () => {
    let mockOnClose;

    beforeEach(() => {
        mockOnClose = vi.fn();
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    status: 'processing',
                    processing_steps: JSON.stringify([{ step: 'Novo Passo', detail: 'x', timestamp: new Date().toISOString() }]),
                    agent_response: null,
                    updated_at: new Date().toISOString(),
                    scheduled_at: null,
                    created_at: '2026-05-18T10:07:22Z',
                    server_now: new Date().toISOString()
                })
            })
        );
        global.WebSocket = vi.fn(() => ({ close: vi.fn(), onmessage: null }));
    });

    it('com webhook_config_id presente: clique deve chamar fetch', async () => {
        const mockEvent = {
            id: 1,
            webhook_config_id: 10,
            status: 'processing',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([])
        };
        render(<AutomationPipelineModal event={mockEvent} onClose={mockOnClose} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const callsBefore = global.fetch.mock.calls.length;
        const btn = screen.getByTitle('Atualizar pipeline');
        fireEvent.click(btn);
        await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('SEM webhook_config_id (undefined): deve usar fallback para endpoint /webhooks/events/{id}', async () => {
        const mockEvent = {
            id: 1,
            // webhook_config_id ausente de propósito
            status: 'processing',
            created_at: new Date().toISOString(),
            processing_steps: JSON.stringify([])
        };
        render(<AutomationPipelineModal event={mockEvent} onClose={mockOnClose} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/webhooks/events/1')));
        const btn = screen.getByTitle('Atualizar pipeline');
        fireEvent.click(btn);
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/webhooks/events/1')));
    });
});

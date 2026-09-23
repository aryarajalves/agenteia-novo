import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WebhookManager from '../../components/WebhookManager';
import { api } from '../../api/client';

// Helper para criar Response mock
const createMockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
});

vi.mock('../../api/client', () => {
    const mockApi = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    };
    return {
        api: mockApi,
        default: mockApi,
    };
});

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8000',
}));

// Mock do scrollIntoView
if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe('WebhookManager - Refactored Component', () => {
    const mockWebhook = {
        id: 1,
        name: 'Webhook Teste',
        token: 'test-token',
        leads_table: 'leads_test',
        is_active: true,
        created_at: '2023-01-01T10:00:00Z',
    };

    const mockAgents = [
        { id: 1, name: 'Agente 1', description: 'Desc 1' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url === '/webhooks') return Promise.resolve(createMockResponse([mockWebhook]));
            if (url === '/agents') return Promise.resolve(createMockResponse(mockAgents));
            if (url === '/chatwoot-config') return Promise.resolve(createMockResponse({ configured: true }));
            return Promise.resolve(createMockResponse([]));
        });
    });

    it('deve renderizar o título correto e a lista de webhooks', async () => {
        render(<WebhookManager />);

        // Verifica o novo título
        expect(await screen.findByText(/Integrações Webhook/i)).toBeInTheDocument();
        
        // Verifica se o webhook mockado aparece
        expect(await screen.findByText(/Webhook Teste/i)).toBeInTheDocument();
        expect(screen.getByText(/leads_test/i)).toBeInTheDocument();
    });

    it('deve abrir o modal de criação ao clicar em Novo Webhook', async () => {
        render(<WebhookManager />);
        
        const btnNovo = await screen.findByRole('button', { name: /\+ Novo Webhook/i });
        fireEvent.click(btnNovo);
        
        expect(await screen.findByText(/Configurar Integração|Nova Integração/i)).toBeInTheDocument();
    });

    it('deve alternar o status ativo/inativo ao clicar no switch', async () => {
        api.patch.mockResolvedValue(createMockResponse({ ...mockWebhook, is_active: false }));
        
        const { container } = render(<WebhookManager />);
        
        await screen.findByText(/Webhook Teste/i);
        const switchBtn = container.querySelector('.toggle-switch');
        expect(switchBtn).toBeInTheDocument();
        fireEvent.click(switchBtn);
        
        expect(api.patch).toHaveBeenCalledWith(expect.stringContaining('/toggle-active'));
    });
});

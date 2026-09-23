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

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8000',
}));

// Mock do scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('WebhookManager - Gestão de Estado de Abas', () => {
    const mockWebhook = {
        id: 1,
        name: 'Webhook Teste',
        token: 'test-token',
        memory_token: 'memory-token',
    };

    const mockEvents = [
        { id: 1, event_type: 'message', telefone: '123', contato_nome: 'João', created_at: '2023-01-01T10:00:00Z' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url === '/webhooks') return Promise.resolve(createMockResponse([mockWebhook]));
            if (url === '/agents') return Promise.resolve(createMockResponse([]));
            if (url.includes('/events')) return Promise.resolve(createMockResponse({ items: mockEvents, total: 1 }));
            return Promise.resolve(createMockResponse([]));
        });
    });

    it('deve limpar a lista de eventos e mostrar carregamento ao trocar para a aba Pipeline', async () => {
        render(<WebhookManager />);

        // 1. Espera o título aparecer
        await waitFor(() => expect(screen.getByText(/Integrações Webhook/i)).toBeInTheDocument(), { timeout: 5000 });

        // 2. Abre os contatos/histórico
        const historicoBtn = await screen.findByText(/Contatos|Histórico/i);
        fireEvent.click(historicoBtn);

        // Verifica se os eventos da aba 'disparos' aparecem
        await waitFor(() => expect(screen.getByText(/João/i)).toBeInTheDocument());

        // 3. Agora clica na aba Pipeline Follow-Up
        const pipelineTab = await screen.findByText(/Pipeline Follow-Up/i);
        
        // Mock do próximo fetch para demorar um pouco
        api.get.mockImplementation((url) => {
            if (url.includes('event_type=followup')) {
                return new Promise(resolve => setTimeout(() => resolve(createMockResponse([])), 100));
            }
            return Promise.resolve(createMockResponse([]));
        });

        fireEvent.click(pipelineTab);

        // a) Deve mostrar o indicador de carregamento
        expect(screen.getByText(/Buscando eventos/i)).toBeInTheDocument();

        // b) A lista antiga ("João") deve ter sumido
        expect(screen.queryByText(/João/i)).not.toBeInTheDocument();

        // c) Após o loading, deve mostrar o estado vazio
        await waitFor(() => expect(screen.getByText(/Nenhum evento recebido ainda/i)).toBeInTheDocument(), { timeout: 2000 });
    });
});

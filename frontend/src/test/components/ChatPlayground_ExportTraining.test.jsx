import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatPlayground from '../../components/ChatPlayground';
import { exportConversationForTraining, generateConversationHtml } from '../../components/ChatPlayground/utils/exportTraining';

// Mocks
const mockAgents = [
    {
        id: 1,
        name: 'Agente - Tarcira',
        system_prompt: 'Você é a assistente oficial da Tarcira.',
        dynamic_prompt: 'Diretrizes dinâmicas do agente.',
        model: 'gpt-4o'
    }
];

const mockGet = vi.fn((path) => {
    if (path === '/agents') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAgents) });
    }
    if (path === '/global-variables') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (path.includes('/sessions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
});

vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        delete: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    }
}));

describe('ChatPlayground - Exportação de Conversa em HTML', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar o botão "Exportar" no cabeçalho do Playground', async () => {
        render(
            <MemoryRouter initialEntries={['/playground?agentId=1']}>
                <ChatPlayground />
            </MemoryRouter>
        );

        const exportBtn = await screen.findByTestId('export-training-btn');
        expect(exportBtn).toBeInTheDocument();
        expect(exportBtn).toHaveTextContent(/Exportar/i);
    });

    it('deve gerar corretamente o HTML da conversa contendo as perguntas do usuário e respostas do agente', () => {
        const messages = [
            { role: 'user', content: 'Qual o valor do curso?', timestamp: '2026-09-01T10:00:00Z' },
            { 
                role: 'assistant', 
                content: 'O curso custa R$ 497 à vista.', 
                timestamp: '2026-09-01T10:01:00Z',
                metrics: { tokens: 120, cost: 0.005, response_time_ms: 600 },
                model_used: 'gpt-4o'
            }
        ];

        const html = generateConversationHtml({
            agentName: 'Agente - Tarcira',
            sessionId: 'sess_123',
            messages,
            sessionStats: { totalCost: 0.005, totalTokens: 120 },
            exportedAt: '2026-09-01T10:05:00Z'
        });

        expect(html).toContain('Conversa com Agente - Tarcira');
        expect(html).toContain('Qual o valor do curso?');
        expect(html).toContain('O curso custa R$ 497 à vista.');
        expect(html).toContain('Usuário');
        expect(html).toContain('Agente - Tarcira');
        expect(html).toContain('gpt-4o');
    });

    it('deve exportar arquivo HTML e disparar o download com sucesso', async () => {
        const showToast = vi.fn();
        const messages = [
            { role: 'user', content: 'Qual o valor do curso?', timestamp: '2026-09-01T10:00:00Z' },
            { role: 'assistant', content: 'O curso custa R$ 497.', timestamp: '2026-09-01T10:01:00Z' }
        ];

        // Mock createObjectURL e revokeObjectURL
        const createObjectURLMock = vi.fn(() => 'blob:mock-url');
        const revokeObjectURLMock = vi.fn();
        globalThis.URL.createObjectURL = createObjectURLMock;
        globalThis.URL.revokeObjectURL = revokeObjectURLMock;

        await exportConversationForTraining({
            messages,
            sessionId: 'sess_123',
            selectedAgentId: 1,
            agents: mockAgents,
            showToast
        });

        expect(createObjectURLMock).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('Conversa exportada em HTML com sucesso'),
            'success'
        );
    });

    it('deve exibir aviso quando tentar exportar conversa vazia', async () => {
        const showToast = vi.fn();

        await exportConversationForTraining({
            messages: [],
            sessionId: 'sess_empty',
            selectedAgentId: 1,
            agents: mockAgents,
            showToast
        });

        expect(showToast).toHaveBeenCalledWith(
            'Nenhuma mensagem na conversa atual para exportar.',
            'warning'
        );
    });
});

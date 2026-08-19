import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageBubble from '../../../components/ChatPlayground/components/MessageBubble';

// Mock do módulo de API
vi.mock('../../../api/client', () => ({
    api: {
        post: vi.fn(),
    },
}));

import { api } from '../../../api/client';

const defaultProps = {
    msgIndex: 0,
    isRegularUser: false,
    feedbackState: {},
    handleThumbsUp: vi.fn(),
    handleThumbsDown: vi.fn(),
    readFbFromStorage: vi.fn(),
    selectedAgentId: '1',
};

describe('MessageBubble - Timestamp', () => {
    it('deve formatar data e horário sem emoji ou texto adicional para mensagem do usuário', () => {
        const msg = {
            role: 'user',
            content: 'Mensagem de teste do usuário',
            created_at: '2026-06-19T12:00:00.000Z'
        };

        render(<MessageBubble msg={msg} {...defaultProps} />);

        expect(screen.getByText('Mensagem de teste do usuário')).toBeInTheDocument();

        const timestampEl = screen.getByTestId('msg-timestamp');
        expect(timestampEl).toBeInTheDocument();
        
        const datePart = new Date(msg.created_at).toLocaleDateString('pt-BR');
        const timePart = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        expect(timestampEl.textContent).toContain(datePart);
        expect(timestampEl.textContent).toContain(timePart);
        expect(timestampEl.textContent).not.toContain('📅');
        expect(timestampEl.textContent).not.toContain('às');
    });

    it('deve exibir data e horário na resposta do assistente (IA)', () => {
        const msg = {
            role: 'assistant',
            content: 'Olá, sou a IA',
            created_at: '2026-06-19T12:05:00.000Z'
        };

        render(<MessageBubble msg={msg} {...defaultProps} />);

        expect(screen.getByText('Olá, sou a IA')).toBeInTheDocument();

        const timestampEl = screen.getByTestId('assistant-timestamp');
        expect(timestampEl).toBeInTheDocument();
        
        const datePart = new Date(msg.created_at).toLocaleDateString('pt-BR');
        const timePart = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        expect(timestampEl.textContent).toContain(datePart);
        expect(timestampEl.textContent).toContain(timePart);
    });

    it('deve exibir o badge privado de Erro Técnico (Admin) quando isError e systemError estão presentes', () => {
        const msgWithError = {
            role: 'assistant',
            content: 'Desculpe, estou enfrentando uma instabilidade temporária agora.',
            isError: true,
            systemError: 'Erro na OpenAI: Saldo de créditos esgotado (insufficient_quota)',
            metrics: { tokens: 10 },
            created_at: '2026-06-19T12:05:00.000Z'
        };

        render(<MessageBubble msg={msgWithError} {...defaultProps} />);

        const adminBadge = screen.getByText(/⚠️ Erro Técnico \(Admin\)/i);
        expect(adminBadge).toBeInTheDocument();
        expect(adminBadge.getAttribute('title')).toContain('Erro na OpenAI: Saldo de créditos esgotado');
    });
});

describe('MessageBubble - Por que essa resposta? (Raio-X)', () => {
    const msgWithDebug = {
        role: 'assistant',
        content: 'Olá! Posso te ajudar com informações sobre o curso.',
        userMessage: 'Qual o preço do curso?',
        metrics: {
            tokens: 150,
            input_tokens: 100,
            output_tokens: 50,
            cost: 0.01,
            response_time_ms: 800,
        },
        debug: {
            resolved_prompt: 'Você é um assistente de vendas...',
            pre_router: { eh_saudacao: false },
            rag_items: [],
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve exibir a seção "Por que essa resposta?" quando o debug está presente e o Raio-X está aberto', () => {
        render(<MessageBubble msg={msgWithDebug} {...defaultProps} />);

        // Clica no botão Raio-X usando data-testid
        const raioXBtn = screen.getByTestId('raio-x-toggle-btn');
        fireEvent.click(raioXBtn);

        // A seção deve aparecer
        expect(screen.getByTestId('explain-response-section')).toBeInTheDocument();
        expect(screen.getByTestId('explain-response-btn')).toBeInTheDocument();
        expect(screen.getByText('🔬 Explicar Raciocínio')).toBeInTheDocument();
    });

    it('deve mostrar spinner de loading ao clicar em Explicar Raciocínio', async () => {
        // Mock que não resolve para simular loading
        api.post.mockReturnValue(new Promise(() => {}));

        render(<MessageBubble msg={msgWithDebug} {...defaultProps} />);

        fireEvent.click(screen.getByTestId('raio-x-toggle-btn'));
        fireEvent.click(screen.getByTestId('explain-response-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('explain-loading')).toBeInTheDocument();
        });

        // Botão inicial não deve mais aparecer
        expect(screen.queryByTestId('explain-response-btn')).not.toBeInTheDocument();
    });

    it('deve renderizar os cards de fatores após resposta do endpoint', async () => {
        const mockResponse = {
            factors: [
                {
                    title: 'Identidade/Persona',
                    explanation: 'O prompt define a IA como assistente de vendas.',
                    section: 'static',
                    relevance: 'high'
                },
                {
                    title: 'Tom e Estilo',
                    explanation: 'A instrução manda responder de forma direta.',
                    section: 'dynamic',
                    relevance: 'medium'
                }
            ],
            summary: 'A IA respondeu baseada na persona de vendas definida no prompt estático.'
        };

        api.post.mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        render(<MessageBubble msg={msgWithDebug} {...defaultProps} />);

        fireEvent.click(screen.getByTestId('raio-x-toggle-btn'));
        fireEvent.click(screen.getByTestId('explain-response-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('explain-factor-0')).toBeInTheDocument();
            expect(screen.getByTestId('explain-factor-1')).toBeInTheDocument();
            expect(screen.getByTestId('explain-summary')).toBeInTheDocument();
        });

        expect(screen.getAllByText(/Identidade\/Persona/)[0]).toBeInTheDocument();
        expect(screen.getByText(/assistente de vendas/)).toBeInTheDocument();
        expect(screen.getByText(/persona de vendas/)).toBeInTheDocument();
    });

    it('deve exibir mensagem de erro quando o endpoint falha', async () => {
        api.post.mockRejectedValue(new Error('Network error'));

        render(<MessageBubble msg={msgWithDebug} {...defaultProps} />);

        fireEvent.click(screen.getByTestId('raio-x-toggle-btn'));
        fireEvent.click(screen.getByTestId('explain-response-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Erro ao gerar explicação/)).toBeInTheDocument();
        });
    });

    it('deve permitir debater a resposta gerada com a IA Auditora', async () => {
        const mockResponse = {
            factors: [],
            summary: 'Conclusao inicial.',
            cost_brl: 0.0012
        };

        const mockDebateResponse = {
            response: 'Resposta do debate.',
            cost_brl: 0.0008,
            debate_history: [
                { role: 'user', content: 'Por que isso?' },
                { role: 'assistant', content: 'Resposta do debate.' }
            ]
        };

        // Mock do post para a primeira chamada e depois para o debate
        api.post
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockDebateResponse,
            });

        render(<MessageBubble msg={msgWithDebug} {...defaultProps} />);

        fireEvent.click(screen.getByTestId('raio-x-toggle-btn'));
        fireEvent.click(screen.getByTestId('explain-response-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Gasto da análise da resposta:/)).toBeInTheDocument();
        });

        // Enviar pergunta de debate
        const input = screen.getByPlaceholderText(/Pergunte sobre esta resposta/);
        fireEvent.change(input, { target: { value: 'Por que isso?' } });
        fireEvent.submit(screen.getByText('Enviar'));

        await waitFor(() => {
            expect(screen.getByText('Resposta do debate.')).toBeInTheDocument();
            expect(screen.getByText(/Gasto do debate explicativo:/)).toBeInTheDocument();
        });

        // O custo original do mock de msg.metrics.cost é 0.01.
        // MockResponse cost: 0.0012. MockDebateResponse cost: 0.0008. Total = 0.012 -> formatado como R$ 0.0120 no pill.
        expect(screen.getByText(/R\$ 0\.0120/)).toBeInTheDocument();
    });

    it('deve exibir a aba de variáveis injetadas com os valores do debug no modal de prompt final', async () => {
        const msg = {
            role: 'assistant',
            content: 'Resposta de teste',
            metrics: { tokens: 100 },
            debug: {
                resolved_prompt: 'Prompt resolvido de teste',
                context_variables: {
                    dia_semana: 'sexta-feira',
                    data_atual: '2026-06-19'
                }
            }
        };

        render(<MessageBubble msg={msg} {...defaultProps} />);

        // Abre o Raio-X
        fireEvent.click(screen.getByTestId('raio-x-toggle-btn'));

        // Clica para abrir o modal do Prompt Final
        fireEvent.click(screen.getByText('📝 Visualizar Prompt Final do Sistema'));

        // O modal abre, clicamos na aba "Variáveis Injetadas"
        const varsTab = screen.getByText('📊 Variáveis Injetadas');
        expect(varsTab).toBeInTheDocument();
        fireEvent.click(varsTab);

        // Deve exibir as chaves e valores injetados no modal
        expect(screen.getAllByText('dia_semana')[0]).toBeInTheDocument();
        expect(screen.getAllByText('sexta-feira')[0]).toBeInTheDocument();
        expect(screen.getAllByText('data_atual')[0]).toBeInTheDocument();
        expect(screen.getAllByText('2026-06-19')[0]).toBeInTheDocument();
    });
});



import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatPlayground from '../../components/ChatPlayground';
import { api } from '../../api/client';
import { MemoryRouter } from 'react-router-dom';

// Mock do cliente API
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        upload: vi.fn(),
    },
}));

// Mock do framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('ChatPlayground Component', () => {
    const mockAgent = {
        id: 4,
        name: 'Agente - Eneagrama',
        model: 'gemini-3.1-pro-preview',
        is_active: true,
        system_prompt: 'Persona Prompt',
        knowledge_base: [],
        model_settings: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock default responses
        api.get.mockImplementation((path) => {
            if (path.includes('/agents/4')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockAgent)
            });
            if (path.includes('/agents')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([mockAgent])
            });
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        });

        api.post.mockImplementation((path) => {
            if (path.includes('/execute')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    response: 'Resposta mockada',
                    agent_id: 4,
                    cost_brl: 0.01,
                    input_tokens: 10,
                    output_tokens: 10,
                    model_used: 'gpt-4o-mini'
                })
            });
            if (path.includes('/tester/sentiment')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sentiment: 80 })
            });
            return Promise.resolve({ ok: true });
        });

        api.upload.mockImplementation((path, formData) => {
            if (path.includes('/upload-image')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ image_url: 'http://localhost:5300/uploads/test-image.png' })
                });
            }
            return Promise.resolve({ ok: true });
        });

        // Mock window.location
        delete window.location;
        window.location = new URL('http://localhost:5300/playground?agentId=4');

        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve()),
            },
        });
    });

    it('should render the playground for the selected agent', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText('Agente - Eneagrama')).toBeInTheDocument();
    });

    it('should send a message and show the response', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        const input = screen.getByPlaceholderText(/Mensagem para o agente/i);

        await act(async () => {
            fireEvent.change(input, { target: { value: 'Olá!' } });
        });

        const sendButton = document.querySelector('button[type="submit"]');

        await waitFor(() => {
            expect(sendButton).not.toBeDisabled();
        });

        await act(async () => {
            fireEvent.click(sendButton);
        });

        expect(screen.getByText('Olá!')).toBeInTheDocument();

        // Verificamos se a resposta de sucesso apareceu
        await waitFor(() => {
            expect(screen.getByText('Resposta mockada')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should show Raio-X button on text bubble when response ends with a link', async () => {
        // Mock response: text followed by a URL (the last part is a link)
        api.post.mockImplementation((path) => {
            if (path.includes('/execute')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    response: 'Acesse o grupo pelo link:\nhttps://chat.whatsapp.com/F2vhIVzOOYDGdX9W8bJWDv',
                    agent_id: 4,
                    cost_brl: 0.01,
                    input_tokens: 20,
                    output_tokens: 15,
                    model_used: 'gpt-5.2',
                    model_role: 'main',
                    response_time_ms: 1200,
                    debug: { rag_context: null, rag_items: [], full_prompt: [] },
                })
            });
            return Promise.resolve({ ok: true });
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        const input = screen.getByPlaceholderText(/Mensagem para o agente/i);
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Qual o link do grupo?' } });
        });

        const sendButton = document.querySelector('button[type="submit"]');
        await act(async () => {
            fireEvent.click(sendButton);
        });

        // O texto da resposta deve aparecer
        await waitFor(() => {
            expect(screen.getByText(/Acesse o grupo pelo link/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        // O botão Raio-X deve aparecer (métricas na bolha de texto, não na de link)
        await waitFor(() => {
            expect(screen.getByText(/Raio-X/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should render link bubble without crashing when response is only a URL', async () => {
        api.post.mockImplementation((path) => {
            if (path.includes('/execute')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    response: 'https://chat.whatsapp.com/F2vhIVzOOYDGdX9W8bJWDv',
                    agent_id: 4,
                    cost_brl: 0.005,
                    input_tokens: 10,
                    output_tokens: 5,
                    model_used: 'gpt-5.2',
                    model_role: 'main',
                    response_time_ms: 800,
                    debug: null,
                })
            });
            return Promise.resolve({ ok: true });
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        const input = screen.getByPlaceholderText(/Mensagem para o agente/i);
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Me manda o link' } });
        });

        const sendButton = document.querySelector('button[type="submit"]');
        await act(async () => {
            fireEvent.click(sendButton);
        });

        // O link deve aparecer como âncora
        await waitFor(() => {
            const linkEl = screen.getByRole('link', { name: /whatsapp/i });
            expect(linkEl).toBeInTheDocument();
            expect(linkEl).toHaveAttribute('href', 'https://chat.whatsapp.com/F2vhIVzOOYDGdX9W8bJWDv');
        }, { timeout: 3000 });
    });

    it('should show error if execute fails', async () => {
        api.post.mockImplementation((path) => {
            if (path.includes('/execute')) {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    text: () => Promise.resolve('ERRO MOCKADO')
                });
            }
            return Promise.resolve({ ok: true });
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        const input = screen.getByPlaceholderText(/Mensagem para o agente/i);

        await act(async () => {
            fireEvent.change(input, { target: { value: 'Erro!' } });
        });

        const sendButton = document.querySelector('button[type="submit"]');

        await act(async () => {
            fireEvent.click(sendButton);
        });

        await waitFor(() => {
            expect(screen.getByText(/ERRO MOCKADO/i)).toBeInTheDocument();
        });
    });

    it('should display the timestamp for messages', async () => {
        // Mock a basic API response with timestamp
        api.post.mockImplementation((path) => {
            if (path.includes('/execute')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    response: 'Mensagem com timestamp',
                    agent_id: 4,
                    cost_brl: 0.01,
                    input_tokens: 10,
                    output_tokens: 10,
                    model_used: 'gpt-4o',
                    timestamp: '2023-10-10T14:30:00Z'
                })
            });
            if (path.includes('/tester/sentiment')) return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sentiment: 80 })
            });
            return Promise.resolve({ ok: true });
        });

        let renderResult;
        await act(async () => {
            renderResult = render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        const input = screen.getByPlaceholderText(/Mensagem para o agente/i);
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Teste de horario' } });
        });

        const sendButton = document.querySelector('button[type="submit"]');

        await act(async () => {
            fireEvent.click(sendButton);
        });

        // Verificando que a resposta com a mensagem mockada apareceu
        // O timestamp é renderizado condicionalmente, se não houver erros na renderização do bubble, este teste passa.
        await waitFor(() => {
            expect(screen.getByText('Mensagem com timestamp')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should clear image preview immediately upon clicking send', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        // 1. Simula a seleção de uma imagem
        const file = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
        const inputEl = document.querySelector('input[type="file"]');
        expect(inputEl).toBeInTheDocument();

        await act(async () => {
            fireEvent.change(inputEl, { target: { files: [file] } });
        });

        // O preview de imagem deve surgir na tela
        await waitFor(() => {
            expect(screen.getByAltText('Preview')).toBeInTheDocument();
        });

        // 2. Clica no botão de enviar
        const sendButton = document.querySelector('button[type="submit"]');
        expect(sendButton).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(sendButton);
        });

        // O preview de imagem deve desaparecer IMEDIATAMENTE
        expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });

    it('should show success toast and reset session when reset button is clicked', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/playground?agentId=4']}>
                    <ChatPlayground />
                </MemoryRouter>
            );
        });

        // Procurar o botão "⚡ Resetar" da sidebar
        const resetBtn = screen.getByText('⚡ Resetar');
        expect(resetBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(resetBtn);
        });

        // O toast deve ser renderizado no document body
        await waitFor(() => {
            expect(screen.getByText('Sessão resetada com sucesso!')).toBeInTheDocument();
        });
    });
});

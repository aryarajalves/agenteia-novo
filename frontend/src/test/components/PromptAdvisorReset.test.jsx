import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock do API client
const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    }
}));

vi.mock('../../api/client', () => ({
    api: mockApi
}));

// Mock scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

import PromptEditor from '../../components/PromptEditor';

describe('PromptAdvisor - Funcionalidade de Reset de Memória', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.get.mockImplementation((url) => {
            if (url === '/global-variables') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ variables: [] })
                });
            }
            if (url.includes('/agents/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: '1', name: 'Agente Teste' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        mockApi.post.mockImplementation((url) => {
            if (url === '/prompt-chat') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ 
                        content: 'Na linha **10**, o texto atual é: Exemplo de instrução.',
                        model: 'gpt-4o',
                        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    it('deve limpar o histórico de mensagens ao clicar no botão de reset', async () => {
        render(<PromptEditor value="Prompt base" onChange={() => {}} agentId="1" />);
        
        // Abre o Assistente
        const fab = screen.getByTitle('Assistente de Prompt');
        fireEvent.click(fab);
        
        // Verifica mensagem inicial
        expect(screen.getByText(/Olá! Sou seu/i)).toBeInTheDocument();
        
        // Envia uma mensagem
        const input = screen.getByPlaceholderText(/Peça para buscar ou alterar algo/i);
        fireEvent.change(input, { target: { value: 'Me ajude a melhorar este prompt' } });
        
        // Botão de enviar é o '✈️'
        const sendBtn = screen.getByText('✈️');
        fireEvent.click(sendBtn);
        
        // Aguarda a resposta aparecer
        await waitFor(() => {
            expect(screen.getByText(/Exemplo de instrução/i)).toBeInTheDocument();
            expect(screen.getByText(/20 tokens/i)).toBeInTheDocument(); // 10 prompt + 10 completion = 20 total
        });
        
        // Agora clica no botão de Reset (🔄)
        const resetBtn = screen.getByTitle('Reiniciar Memória');
        fireEvent.click(resetBtn);
        
        // Verifica se a mensagem enviada e a resposta sumiram
        expect(screen.queryByText('Me ajude a melhorar este prompt')).not.toBeInTheDocument();
        expect(screen.queryByText(/Exemplo de instrução/i)).not.toBeInTheDocument();
        
        // Verifica se a mensagem inicial ainda está lá (ou foi reiniciada)
        expect(screen.getByText(/Olá! Sou seu/i)).toBeInTheDocument();
    });

    it('deve mudar o placeholder quando estiver aplicando alterações', async () => {
        render(<PromptEditor value="Prompt base" onChange={() => {}} agentId="1" />);
        
        // Abre o Assistente
        fireEvent.click(screen.getByTitle('Assistente de Prompt'));
        
        // Simula clique em "Aplicar ao Editor"
        const applyBtn = screen.getByText(/Aplicar ao Editor/i);
        
        // Mock do apply-suggestions para demorar um pouco
        mockApi.post.mockImplementationOnce((url) => {
            if (url === '/apply-suggestions') {
                return new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve({ prompt: 'Prompt Atualizado' })
                }), 100));
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        fireEvent.click(applyBtn);
        
        // Verifica se o placeholder mudou
        const input = screen.getByPlaceholderText(/Aplicando alterações.../i);
        expect(input).toBeInTheDocument();
        
        // Aguarda finalizar
        await waitFor(() => {
            expect(screen.queryByPlaceholderText(/Aplicando alterações.../i)).not.toBeInTheDocument();
        });
        
        expect(screen.getByPlaceholderText(/Peça para buscar ou alterar algo/i)).toBeInTheDocument();
    });

    it('deve alternar para tela cheia e restaurar ao clicar no botão de maximizar', async () => {
        render(<PromptEditor value="Prompt base" onChange={() => {}} agentId="1" />);
        
        // Abre o Assistente
        fireEvent.click(screen.getByTitle('Assistente de Prompt'));
        
        // Localiza o botão de maximizar janela
        const maxBtn = screen.getByTitle('Maximizar Janela (Tela Cheia)');
        expect(maxBtn).toBeInTheDocument();
        
        // Clica para maximizar
        fireEvent.click(maxBtn);
        
        // Verifica se o badge de Tela Cheia aparece e o título do botão muda para Restaurar Janela
        expect(screen.getByText('Tela Cheia')).toBeInTheDocument();
        expect(screen.getByTitle('Restaurar Janela')).toBeInTheDocument();
        
        // Clica para restaurar
        fireEvent.click(screen.getByTitle('Restaurar Janela'));
        
        // Verifica se o badge sumiu e voltou ao normal
        expect(screen.queryByText('Tela Cheia')).not.toBeInTheDocument();
        expect(screen.getByTitle('Maximizar Janela (Tela Cheia)')).toBeInTheDocument();
    });

    it('deve fechar o assistente e manter a bolinha do chat (FAB) visível ao clicar no botão X no modo tela cheia', async () => {
        render(<PromptEditor value="Prompt base" onChange={() => {}} agentId="1" />);
        
        // Abre o Assistente
        const fab = screen.getByTitle('Assistente de Prompt');
        fireEvent.click(fab);
        
        // Maximiza para Tela Cheia
        fireEvent.click(screen.getByTitle('Maximizar Janela (Tela Cheia)'));
        expect(screen.getByText('Tela Cheia')).toBeInTheDocument();
        
        // Clica no botão de Fechar (✕)
        const closeBtn = screen.getByTitle('Fechar Assistente');
        fireEvent.click(closeBtn);
        
        // O container de chat deve sumir
        expect(screen.queryByText('Assistente de Prompt', { selector: '.advisor-header-title' })).not.toBeInTheDocument();
        
        // E a bolinha do chat (FAB) DEVE estar visível e pronta para reabrir
        const fabReopened = screen.getByTitle('Assistente de Prompt');
        expect(fabReopened).toBeInTheDocument();
        expect(fabReopened).toHaveTextContent('🤖');
    });

    it('deve converter menção de linha em link interativo e disparar scroll até a linha ao clicar', async () => {
        const multilinePrompt = Array.from({ length: 30 }, (_, i) => `Linha ${i + 1} de instrução`).join('\n');
        
        render(<PromptEditor value={multilinePrompt} onChange={() => {}} agentId="1" />);
        
        // Abre o Assistente
        fireEvent.click(screen.getByTitle('Assistente de Prompt'));
        
        // Simula o envio de uma mensagem para a IA
        const input = screen.getByPlaceholderText(/Peça para buscar ou alterar algo/i);
        fireEvent.change(input, { target: { value: 'Onde está o dono do prompt?' } });
        
        const sendBtn = screen.getByText('✈️');
        fireEvent.click(sendBtn);
        
        // Aguarda a resposta mockada (que contém 'linha 10' ou 'Na linha 1')
        await waitFor(() => {
            const lineLink = screen.queryByTitle(/Clique para rolar o editor de prompt até a Linha/i);
            expect(lineLink).toBeInTheDocument();
        });
        
        const link = screen.getByTitle(/Clique para rolar o editor de prompt até a Linha/i);
        expect(link).toHaveClass('advisor-line-link');
        
        // Clica no link de linha
        fireEvent.click(link);
    });
});

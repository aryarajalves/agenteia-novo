import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock do API client
const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

vi.mock('../../api/client', () => ({
    api: mockApi
}));

// Mock global fetch for the advisor API call
global.fetch = vi.fn();

// Mock scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

import PromptEditor from '../../components/PromptEditor';

describe('PromptEditor - Nova Arquitetura com Consultor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.get.mockImplementation((url) => {
            if (url === '/global-variables') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ variables: [] })
                });
            }
            if (url.startsWith('/agents/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: '1', main_model: 'gpt-4o-mini' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        mockApi.post.mockImplementation((url) => {
            if (url === '/prompt-chat') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ content: 'Sugestão do Consultor: Adicione mais clareza.' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        global.fetch.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ content: 'Sugestão do Consultor: Adicione mais clareza.' }),
            })
        );
    });

    it('deve renderizar o editor e a bolinha flutuante inicialmente', () => {
        render(<PromptEditor value="Teste de Prompt" onChange={() => {}} agentId="1" />);
        expect(screen.getByText(/Instruções do Sistema/i)).toBeInTheDocument();
        expect(screen.getByText('🤖')).toBeInTheDocument(); // A bolinha flutuante real do Consultor é 🤖
    });

    it('deve alternar a visibilidade do chat flutuante ao clicar na bolinha', () => {
        render(<PromptEditor value="" onChange={() => {}} />);
        const bubble = screen.getByText('🤖');
        
        // Abre
        fireEvent.click(bubble);
        expect(screen.getAllByText(/Consultor de Prompt/i).length).toBeGreaterThan(0);
        
        // Fecha clicando novamente na bolinha (que muda o título de texto para ✖)
        const closeBubble = screen.getByText('✖');
        fireEvent.click(closeBubble);
        expect(screen.queryByText(/IA Especialista/i)).not.toBeInTheDocument();
    });

    it('deve permitir enviar mensagem para o consultor e receber resposta', async () => {
        render(<PromptEditor value="Prompt inicial" onChange={() => {}} />);
        
        // Abre o chat antes de enviar
        fireEvent.click(screen.getByText('🤖'));
        
        const input = screen.getByPlaceholderText(/Peça para buscar ou alterar algo\.\.\./i);
        const sendBtn = screen.getByText('✈️');

        fireEvent.change(input, { target: { value: 'Como melhorar este prompt?' } });
        fireEvent.click(sendBtn);

        expect(screen.getByText('Como melhorar este prompt?')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText(/Sugestão do Consultor: Adicione mais clareza/i)).toBeInTheDocument();
        });
        
        expect(mockApi.post).toHaveBeenCalled();
    });

    it('deve chamar onChange ao digitar no editor', () => {
        const handleChange = vi.fn();
        render(<PromptEditor value="" onChange={handleChange} />);
        
        const textarea = screen.getByPlaceholderText(/Escreva as instruções do agente\.\.\./i);
        fireEvent.change(textarea, { target: { value: 'Novo conteúdo' } });
        
        expect(handleChange).toHaveBeenCalled();
    });

    it('deve permitir renomear o comentário de título da condicional', async () => {
        const handleChange = vi.fn();
        const promptWithCond = [
            '# Regra de Horário',
            '[IF:hora_atual >= 08:00]',
            'Bom dia!',
            '[ELSE]',
            'Boa noite!',
            '[/IF]',
        ].join('\n');

        render(<PromptEditor value={promptWithCond} onChange={handleChange} />);

        // Abre o modal de edição clicando no card de condicional (ou usando mock de disparo)
        const insertBtn = screen.getByText(/Inserir Condicional/i);
        fireEvent.click(insertBtn);

        // Seleciona a variável
        const varItem = screen.getByTitle(/Clique para configurar condicional para {data_atual}/i);
        fireEvent.click(varItem);

        await waitFor(() => {
            expect(screen.getByText(/Configurar Condicional/i)).toBeInTheDocument();
        });

        // Localiza o input do título/comentário
        const titleInput = screen.getByLabelText(/🏷️ Título \/ Comentário da Condicional/i);
        expect(titleInput).toBeInTheDocument();
        fireEvent.change(titleInput, { target: { value: 'Meu Novo Comentario Legal' } });

        // Salva
        const saveBtn = screen.getByText(/Inserir no Prompt/i);
        fireEvent.click(saveBtn);

        expect(handleChange).toHaveBeenCalled();
        const newValue = handleChange.mock.calls[0][0].target.value;
        expect(newValue).toContain('# Meu Novo Comentario Legal');
    });

    it('deve abrir submodal de confirmação de exclusão e deletar o bloco condicional ao confirmar', async () => {
        const handleChange = vi.fn();
        const promptWithCond = [
            'Texto Superior',
            '# Regra de Horário',
            '[IF:hora_atual >= 08:00]',
            'Bom dia!',
            '[ELSE]',
            'Boa noite!',
            '[/IF]',
            'Texto Inferior',
        ].join('\n');

        render(<PromptEditor value={promptWithCond} onChange={handleChange} />);

        // O botão de edição deve estar presente no DOM
        const editBtn = screen.getByTestId('cond-edit-btn-0');
        expect(editBtn).toBeInTheDocument();
        fireEvent.click(editBtn);

        await waitFor(() => {
            expect(screen.getByText(/Editando Condicional/i)).toBeInTheDocument();
        });

        // Localiza e clica no botão de deletar
        const deleteBtn = screen.getByText(/Deletar Condicional/i);
        expect(deleteBtn).toBeInTheDocument();
        fireEvent.click(deleteBtn);

        // Submodal de confirmação de exclusão deve estar visível
        expect(screen.getByText(/Confirmar Exclusão/i)).toBeInTheDocument();

        // Clicar em "Sim, Deletar"
        const confirmBtn = screen.getByText(/Sim, Deletar/i);
        fireEvent.click(confirmBtn);

        expect(handleChange).toHaveBeenCalled();
        const newValue = handleChange.mock.calls[0][0].target.value;
        // O bloco condicional (e seu título) deve ter sido totalmente removido
        expect(newValue).not.toContain('Regra de Horário');
        expect(newValue).not.toContain('[IF:hora_atual');
        expect(newValue.trim()).toBe('Texto Superior\n\nTexto Inferior');
    });

    it('deve ocultar a bolinha do assistente e alternar para modo expandido ao clicar em Tela Cheia', async () => {
        render(<PromptEditor value="Texto qualquer" onChange={() => {}} />);
        
        // Inicialmente a bolinha flutuante está visível
        expect(screen.getByText('🤖')).toBeInTheDocument();
        
        // Botão de Tela Cheia
        const fullscreenBtn = screen.getByText(/🔲 Tela Cheia/i);
        expect(fullscreenBtn).toBeInTheDocument();
        
        fireEvent.click(fullscreenBtn);
        
        // O botão deve alternar para Sair da Tela Cheia
        await waitFor(() => {
            expect(screen.getByText(/✖ Sair da Tela Cheia/i)).toBeInTheDocument();
        });
        
        // A bolinha flutuante deve ser removida / desativada
        expect(screen.queryByText('🤖')).not.toBeInTheDocument();
        expect(document.body.classList.contains('prompt-fullscreen-active')).toBe(true);
    });

    it('deve sair do modo tela cheia e restaurar a bolinha do assistente ao pressionar Escape', async () => {
        render(<PromptEditor value="Texto qualquer" onChange={() => {}} />);
        
        const fullscreenBtn = screen.getByText(/🔲 Tela Cheia/i);
        fireEvent.click(fullscreenBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/✖ Sair da Tela Cheia/i)).toBeInTheDocument();
        });
        expect(screen.queryByText('🤖')).not.toBeInTheDocument();
        
        // Pressiona ESC para sair da tela cheia
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
        
        await waitFor(() => {
            expect(screen.getByText(/🔲 Tela Cheia/i)).toBeInTheDocument();
        });
        
        // A bolinha flutuante deve voltar a ser exibida
        expect(screen.getByText('🤖')).toBeInTheDocument();
        expect(document.body.classList.contains('prompt-fullscreen-active')).toBe(false);
    });
});

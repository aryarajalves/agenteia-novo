import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AutomationPipelineModal from '../../components/WebhookManager/components/AutomationPipelineModal';

// Mock usePipelineEvent hook
vi.mock('../../components/WebhookManager/components/AutomationPipelineModal/hooks/usePipelineEvent', () => ({
    usePipelineEvent: (initialEvent) => ({
        event: {
            ...initialEvent,
            created_at: '2026-08-27T08:52:41.000Z',
            status: 'completed',
            processing_steps: JSON.stringify([
                {
                    step: '⚡ ⏱️ Agrupamento Ativo',
                    detail: 'Aguardando 3s para ver se o usuário envia mais mensagens.',
                    timestamp: '2026-08-27T08:52:41.000Z'
                },
                {
                    step: '🧠 RAG Semantic Search',
                    detail: 'Encontradas 3 perguntas similares na base de conhecimento: como funciona, preco, garantia.',
                    timestamp: '2026-08-27T08:52:44.000Z'
                },
                {
                    step: '🛠️ Disparo ZapVoice WhatsApp',
                    detail: 'Mensagem de áudio enviada com sucesso.',
                    timestamp: '2026-08-27T08:52:45.000Z'
                }
            ])
        },
        loading: false,
        initialLoading: false,
        isTimeout: false,
        pollEvent: vi.fn(),
        handleManualRefresh: vi.fn()
    })
}));

describe('AutomationPipelineModal - Novas Funcionalidades (02, 03, 04)', () => {
    const mockEvent = {
        id: 123,
        contato_nome: 'Aryaraj Alves',
        telefone: '5585996123586',
        labels: ['Lead Quente', 'WhatsApp'],
        created_at: '2026-08-27T08:52:41.000Z',
        status: 'completed'
    };

    it('Opção 02: Deve exibir o Nome, Telefone formatado e Tags do Lead no cabeçalho', () => {
        render(<AutomationPipelineModal event={mockEvent} webhookId={1} onClose={() => {}} />);

        // Nome do contato
        expect(screen.getByText(/Aryaraj Alves/i)).toBeInTheDocument();
        // Telefone formatado
        expect(screen.getByText(/\+55 \(85\) 99612-3586/i)).toBeInTheDocument();
        // Tags
        expect(screen.getByText(/🏷️ Lead Quente/i)).toBeInTheDocument();
        expect(screen.getByText(/🏷️ WhatsApp/i)).toBeInTheDocument();
    });

    it('Opção 03: Deve filtrar os passos do pipeline em tempo real pelo campo de busca', () => {
        render(<AutomationPipelineModal event={mockEvent} webhookId={1} onClose={() => {}} />);

        const searchInput = screen.getByPlaceholderText(/Buscar no pipeline/i);
        expect(searchInput).toBeInTheDocument();

        // Inicialmente exibe todos os passos
        expect(screen.getByText(/Agrupamento Ativo/i)).toBeInTheDocument();
        expect(screen.getByText(/RAG Semantic Search/i)).toBeInTheDocument();
        expect(screen.getByText(/Disparo ZapVoice WhatsApp/i)).toBeInTheDocument();

        // Digita "ZapVoice"
        fireEvent.change(searchInput, { target: { value: 'ZapVoice' } });

        // Apenas o passo de ZapVoice deve estar visível
        expect(screen.getByText(/Disparo ZapVoice WhatsApp/i)).toBeInTheDocument();
        expect(screen.queryByText(/Agrupamento Ativo/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/RAG Semantic Search/i)).not.toBeInTheDocument();

        // Limpa a busca
        fireEvent.change(searchInput, { target: { value: '' } });
        expect(screen.getByText(/Agrupamento Ativo/i)).toBeInTheDocument();
    });

    it('Opção 04: Deve alternar entre "Recolher Todos" e "Expandir Todos"', () => {
        render(<AutomationPipelineModal event={mockEvent} webhookId={1} onClose={() => {}} />);

        const collapseBtn = screen.getByText(/Recolher Todos/i);
        expect(collapseBtn).toBeInTheDocument();

        // Clica para recolher todos
        fireEvent.click(collapseBtn);

        // O botão deve mudar para "Expandir Todos"
        expect(screen.getByText(/Expandir Todos/i)).toBeInTheDocument();

        // Clica para expandir novamente
        fireEvent.click(screen.getByText(/Expandir Todos/i));
        expect(screen.getByText(/Recolher Todos/i)).toBeInTheDocument();
    });
});

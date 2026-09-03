import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SemanticCacheLeadQuestionsTab from '../../components/ConfigPanel/components/SemanticCache/SemanticCacheLeadQuestionsTab';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn()
    }
}));

describe('SemanticCacheLeadQuestionsTab Component', () => {
    const mockOnAddToCache = vi.fn();
    const mockQuestionsResponse = {
        items: [
            {
                event_id: 101,
                user_query: 'Quanto custa o curso?',
                agent_response: 'O valor do curso é R$ 297.',
                from_cache: false,
                similarity_pct: '72.4%',
                contact_name: 'Ana Paula',
                contact_phone: '+558599991111',
                created_at: '2026-09-02T10:00:00Z'
            },
            {
                event_id: 102,
                user_query: 'Tem garantia?',
                agent_response: 'Sim, você tem 7 dias de garantia incondicional.',
                from_cache: true,
                similarity_pct: '97.8%',
                contact_name: 'Carlos Alberto',
                contact_phone: '+558599992222',
                created_at: '2026-09-02T10:15:00Z'
            }
        ],
        total: 2,
        no_cache_count: 1,
        has_cache_count: 1,
        page: 1,
        page_size: 15,
        total_pages: 1
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({
            ok: true,
            json: async () => mockQuestionsResponse
        });
    });

    it('deve renderizar a aba, filtros e buscar as dúvidas do backend', async () => {
        render(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} />);

        // Valida que o container e os filtros aparecem
        expect(screen.getByTestId('semantic-cache-lead-questions-tab')).toBeInTheDocument();
        expect(screen.getByTestId('filter-no-cache')).toBeInTheDocument();
        expect(screen.getByTestId('filter-has-cache')).toBeInTheDocument();
        expect(screen.getByTestId('filter-all')).toBeInTheDocument();

        // Aguarda carregar os cards das perguntas
        await waitFor(() => {
            expect(screen.getByText('"Quanto custa o curso?"')).toBeInTheDocument();
            expect(screen.getByText('"Tem garantia?"')).toBeInTheDocument();
        });

        // Valida badges
        expect(screen.getAllByText(/Sem Cache/).length).toBeGreaterThan(0);
        expect(screen.getByText(/No Cache \(97.8%\)/)).toBeInTheDocument();
    });

    it('deve disparar onAddToCache com a pergunta, resposta do agente e event_id ao clicar no botão', async () => {
        render(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} />);

        await waitFor(() => {
            expect(screen.getByTestId('btn-add-cache-101')).toBeInTheDocument();
        });

        const btnAdd = screen.getByTestId('btn-add-cache-101');
        fireEvent.click(btnAdd);

        expect(mockOnAddToCache).toHaveBeenCalledWith({
            event_id: 101,
            user_query: 'Quanto custa o curso?',
            approved_response: 'O valor do curso é R$ 297.'
        });
    });

    it('deve remover a dúvida imediatamente quando lastAddedQuestion for disparado', async () => {
        const { rerender } = render(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} />);

        await waitFor(() => {
            expect(screen.getByTestId('lead-question-card-101')).toBeInTheDocument();
        });

        // Simular que o usuário adicionou esta dúvida ao cache
        rerender(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} lastAddedQuestion={{ eventId: 101, userQuery: 'Quanto custa o curso?' }} />);

        // A dúvida deve desaparecer da lista
        expect(screen.queryByTestId('lead-question-card-101')).toBeNull();
    });

    it('deve filtrar ao clicar no botão de status No Cache', async () => {
        render(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} />);

        await waitFor(() => {
            expect(screen.getByTestId('filter-has-cache')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('filter-has-cache'));

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('filter_status=has_cache'));
        });
    });

    it('deve abrir modal de confirmação ao clicar em Não Vale a Pena e ignorar a pergunta', async () => {
        api.post = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
        render(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} />);

        await waitFor(() => {
            expect(screen.getByTestId('btn-ignore-question-101')).toBeInTheDocument();
        });

        // Clica no botão de ignorar do primeiro card
        fireEvent.click(screen.getByTestId('btn-ignore-question-101'));

        // Valida que o modal de confirmação abriu no centro
        expect(screen.getByTestId('ignore-lead-question-modal-panel')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza de que/i)).toBeInTheDocument();

        // Clica no botão de confirmar ignore
        const confirmBtn = screen.getByTestId('confirm-ignore-modal-btn');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/semantic-cache/lead-questions/101/ignore');
        });
    });

    it('deve exibir a barra de paginação com botões desativados quando houver apenas 1 página ou menos de 20 itens', async () => {
        render(<SemanticCacheLeadQuestionsTab agentId={1} onAddToCache={mockOnAddToCache} />);

        await waitFor(() => {
            expect(screen.getByTestId('lead-questions-pagination')).toBeInTheDocument();
        });

        const prevBtn = screen.getByTestId('lead-questions-prev-page');
        const nextBtn = screen.getByTestId('lead-questions-next-page');

        expect(prevBtn).toBeInTheDocument();
        expect(prevBtn).toBeDisabled();
        expect(nextBtn).toBeInTheDocument();
        expect(nextBtn).toBeDisabled();

        expect(screen.getByText(/Mostrando até/)).toBeInTheDocument();
        expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    });
});

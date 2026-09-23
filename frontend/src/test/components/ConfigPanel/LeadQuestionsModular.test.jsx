import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    useSemanticCacheLeadQuestions,
    LeadQuestionsFilterBar,
    LeadQuestionsTipsBanner,
    LeadQuestionsPagination,
    LeadQuestionsList
} from '../../../components/ConfigPanel/components/SemanticCache/LeadQuestions';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

describe('LeadQuestions Modular Subcomponents and Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('LeadQuestionsFilterBar', () => {
        it('deve renderizar os botões de filtro e disparar os eventos corretos', () => {
            const onFilterChange = vi.fn();
            const onSearchChange = vi.fn();
            const onClearSearch = vi.fn();
            const onRefresh = vi.fn();

            render(
                <LeadQuestionsFilterBar
                    filterStatus="no_cache"
                    noCacheCount={12}
                    hasCacheCount={5}
                    searchTerm="promoção"
                    onFilterChange={onFilterChange}
                    onSearchChange={onSearchChange}
                    onClearSearch={onClearSearch}
                    onRefresh={onRefresh}
                />
            );

            expect(screen.getByTestId('filter-no-cache')).toBeInTheDocument();
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByTestId('filter-has-cache')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
            expect(screen.getByTestId('filter-all')).toBeInTheDocument();
            expect(screen.getByText('17')).toBeInTheDocument(); // 12 + 5

            fireEvent.click(screen.getByTestId('filter-has-cache'));
            expect(onFilterChange).toHaveBeenCalledWith('has_cache');

            const searchInput = screen.getByTestId('search-lead-questions');
            expect(searchInput.value).toBe('promoção');

            fireEvent.change(searchInput, { target: { value: 'garantia' } });
            expect(onSearchChange).toHaveBeenCalled();

            const clearBtn = screen.getByText('✕');
            fireEvent.click(clearBtn);
            expect(onClearSearch).toHaveBeenCalled();

            const refreshBtn = screen.getByTitle('Atualizar lista');
            fireEvent.click(refreshBtn);
            expect(onRefresh).toHaveBeenCalled();
        });
    });

    describe('LeadQuestionsTipsBanner', () => {
        it('deve renderizar a dica de economia corretamente', () => {
            render(<LeadQuestionsTipsBanner />);
            expect(screen.getByText(/Dica de Economia:/i)).toBeInTheDocument();
            expect(screen.getByText(/custo zero/i)).toBeInTheDocument();
        });
    });

    describe('LeadQuestionsPagination', () => {
        it('não deve renderizar nada se questionsCount for 0', () => {
            const { container } = render(
                <LeadQuestionsPagination
                    questionsCount={0}
                    pageSize={20}
                    currentPage={1}
                    totalPages={1}
                    totalCount={0}
                    loading={false}
                    onPageChange={vi.fn()}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('deve renderizar a paginação e permitir avançar/voltar páginas', () => {
            const onPageChange = vi.fn();
            render(
                <LeadQuestionsPagination
                    questionsCount={10}
                    pageSize={20}
                    currentPage={2}
                    totalPages={5}
                    totalCount={100}
                    loading={false}
                    onPageChange={onPageChange}
                />
            );

            expect(screen.getByTestId('lead-questions-pagination')).toBeInTheDocument();
            expect(screen.getByText('2 / 5')).toBeInTheDocument();
            expect(screen.getByText(/100 dúvidas no total/)).toBeInTheDocument();

            const prevBtn = screen.getByTestId('lead-questions-prev-page');
            const nextBtn = screen.getByTestId('lead-questions-next-page');

            expect(prevBtn).not.toBeDisabled();
            expect(nextBtn).not.toBeDisabled();

            fireEvent.click(prevBtn);
            expect(onPageChange).toHaveBeenCalledWith(1);

            fireEvent.click(nextBtn);
            expect(onPageChange).toHaveBeenCalledWith(3);
        });
    });

    describe('LeadQuestionsList', () => {
        it('deve renderizar loading spinner quando loading=true', () => {
            render(
                <LeadQuestionsList
                    loading={true}
                    questions={[]}
                    searchTerm=""
                    onAddToCache={vi.fn()}
                    onIgnoreQuestion={vi.fn()}
                    formatDate={vi.fn()}
                />
            );
            expect(screen.getByText('Carregando dúvidas dos leads...')).toBeInTheDocument();
        });

        it('deve renderizar empty state quando questions estiver vazio', () => {
            render(
                <LeadQuestionsList
                    loading={false}
                    questions={[]}
                    searchTerm=""
                    onAddToCache={vi.fn()}
                    onIgnoreQuestion={vi.fn()}
                    formatDate={vi.fn()}
                />
            );
            expect(screen.getByText('Nenhuma dúvida encontrada')).toBeInTheDocument();
            expect(screen.getByText(/Ainda não há mensagens de leads registradas/)).toBeInTheDocument();
        });

        it('deve renderizar cards de perguntas quando houver itens', () => {
            const mockQuestions = [
                {
                    event_id: 201,
                    user_query: 'Qual é o prazo de entrega?',
                    agent_response: 'O prazo é de 3 a 5 dias úteis.',
                    from_cache: false,
                    similarity_pct: null,
                    contact_name: 'Mariana',
                    contact_phone: '+551199998888',
                    created_at: '2026-09-02T12:00:00Z'
                }
            ];

            render(
                <LeadQuestionsList
                    loading={false}
                    questions={mockQuestions}
                    searchTerm=""
                    onAddToCache={vi.fn()}
                    onIgnoreQuestion={vi.fn()}
                    formatDate={(d) => d}
                />
            );

            expect(screen.getByText('"Qual é o prazo de entrega?"')).toBeInTheDocument();
            
            // A resposta começa recolhida; clica para expandir
            const expandBtn = screen.getByText('Ver resposta');
            fireEvent.click(expandBtn);
            expect(screen.getByText(/O prazo é de 3 a 5 dias úteis/)).toBeInTheDocument();
        });
    });

    describe('useSemanticCacheLeadQuestions hook', () => {
        it('deve inicializar com valores padrão e responder às ações', async () => {
            api.get.mockResolvedValue({
                ok: true,
                json: async () => ({
                    items: [{ event_id: 301, user_query: 'Funciona no celular?' }],
                    total: 1,
                    no_cache_count: 1,
                    has_cache_count: 0,
                    total_pages: 1,
                    page: 1
                })
            });

            const { result } = renderHook(() => useSemanticCacheLeadQuestions({ agentId: 10 }));

            await act(async () => {
                await result.current.loadQuestions();
            });

            expect(result.current.questions.length).toBe(1);
            expect(result.current.totalCount).toBe(1);
            expect(result.current.noCacheCount).toBe(1);

            act(() => {
                result.current.handleFilterChange('has_cache');
            });
            expect(result.current.filterStatus).toBe('has_cache');
            expect(result.current.currentPage).toBe(1);

            act(() => {
                result.current.handleSearchChange({ target: { value: 'celular' } });
            });
            expect(result.current.searchTerm).toBe('celular');

            act(() => {
                result.current.handleClearSearch();
            });
            expect(result.current.searchTerm).toBe('');
        });
    });
});

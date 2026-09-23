import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    useQuestionFunnels,
    QuestionFunnelsToast,
    QuestionFunnelsHeader,
    QuestionFunnelsSearchBar,
    QuestionFunnelsList,
    QuestionFunnelsModals
} from '../../../components/ConfigPanel/components/QuestionFunnels';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

describe('QuestionFunnels Modular Subcomponents and Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('QuestionFunnelsToast', () => {
        it('deve retornar null se não houver mensagem', () => {
            const { container } = render(<QuestionFunnelsToast toastMessage={null} />);
            expect(container.firstChild).toBeNull();
        });

        it('deve renderizar mensagem de sucesso e de erro com ícones apropriados', () => {
            const { rerender } = render(<QuestionFunnelsToast toastMessage={{ msg: 'Salvo com sucesso!', type: 'success' }} />);
            expect(screen.getByText('Salvo com sucesso!')).toBeInTheDocument();
            expect(screen.getByText('✅')).toBeInTheDocument();

            rerender(<QuestionFunnelsToast toastMessage={{ msg: 'Erro ao conectar!', type: 'error' }} />);
            expect(screen.getByText('Erro ao conectar!')).toBeInTheDocument();
            expect(screen.getByText('❌')).toBeInTheDocument();
        });
    });

    describe('QuestionFunnelsHeader', () => {
        it('deve exibir contador de ativos e disparar callback de novo funil', () => {
            const onNewFunnel = vi.fn();
            render(
                <QuestionFunnelsHeader
                    activeCount={3}
                    totalItems={10}
                    onNewFunnel={onNewFunnel}
                />
            );

            expect(screen.getByText(/Funis de Conversão por Dúvida/i)).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText(/de 10/)).toBeInTheDocument();

            const btn = screen.getByRole('button', { name: /\+? ?Novo Funil por Dúvida/i });
            fireEvent.click(btn);
            expect(onNewFunnel).toHaveBeenCalled();
        });
    });

    describe('QuestionFunnelsSearchBar', () => {
        it('deve retornar null se totalItems <= 0 e searchTerm estiver vazio', () => {
            const { container } = render(
                <QuestionFunnelsSearchBar
                    totalItems={0}
                    searchTerm=""
                    onSearchChange={vi.fn()}
                    onClearSearch={vi.fn()}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('deve exibir input e botão de limpar quando houver busca ativa', () => {
            const onSearchChange = vi.fn();
            const onClearSearch = vi.fn();

            render(
                <QuestionFunnelsSearchBar
                    totalItems={5}
                    searchTerm="garantia"
                    onSearchChange={onSearchChange}
                    onClearSearch={onClearSearch}
                />
            );

            const input = screen.getByPlaceholderText(/Buscar por nome do funil/i);
            expect(input.value).toBe('garantia');

            const clearBtn = screen.getByTitle('Limpar busca');
            fireEvent.click(clearBtn);
            expect(onClearSearch).toHaveBeenCalled();
        });
    });

    describe('QuestionFunnelsList', () => {
        it('deve renderizar loading spinner quando loading=true', () => {
            render(
                <QuestionFunnelsList
                    loading={true}
                    displayedFunnels={[]}
                    searchTerm=""
                    page={1}
                    totalPages={1}
                    totalItems={0}
                    pageSize={20}
                    onPageChange={vi.fn()}
                    onToggleActive={vi.fn()}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                    onTest={vi.fn()}
                    onClearSearch={vi.fn()}
                    onCreateNew={vi.fn()}
                />
            );
            expect(screen.getByText(/Carregando funis por dúvida/i)).toBeInTheDocument();
        });

        it('deve renderizar empty state para termo de busca não encontrado', () => {
            const onClearSearch = vi.fn();
            render(
                <QuestionFunnelsList
                    loading={false}
                    displayedFunnels={[]}
                    searchTerm="teste inexistente"
                    page={1}
                    totalPages={1}
                    totalItems={5}
                    pageSize={20}
                    onPageChange={vi.fn()}
                    onToggleActive={vi.fn()}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                    onTest={vi.fn()}
                    onClearSearch={onClearSearch}
                    onCreateNew={vi.fn()}
                />
            );

            expect(screen.getByText(/Nenhum funil encontrado para "teste inexistente"/i)).toBeInTheDocument();
            const clearBtn = screen.getByRole('button', { name: /Limpar busca/i });
            fireEvent.click(clearBtn);
            expect(onClearSearch).toHaveBeenCalled();
        });

        it('deve renderizar lista de funis e paginação quando houver funis', () => {
            const mockFunnels = [
                {
                    id: 99,
                    agent_id: 10,
                    name: 'Funil Teste Modular',
                    trigger_question: 'quanto custa?',
                    trigger_variations: [],
                    similarity_threshold: 0.8,
                    frequency_mode: 'once_per_lead',
                    is_active: true,
                    steps: [],
                    total_executions: 2
                }
            ];

            render(
                <QuestionFunnelsList
                    loading={false}
                    displayedFunnels={mockFunnels}
                    searchTerm=""
                    page={1}
                    totalPages={1}
                    totalItems={1}
                    pageSize={20}
                    onPageChange={vi.fn()}
                    onToggleActive={vi.fn()}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                    onTest={vi.fn()}
                    onClearSearch={vi.fn()}
                    onCreateNew={vi.fn()}
                />
            );

            expect(screen.getByText('Funil Teste Modular')).toBeInTheDocument();
            expect(screen.getByText('"quanto custa?"')).toBeInTheDocument();
        });
    });

    describe('useQuestionFunnels hook', () => {
        it('deve inicializar e gerenciar modais e busca', async () => {
            api.get.mockResolvedValue({
                ok: true,
                json: async () => ({
                    items: [{ id: 1, name: 'F1', trigger_question: 'q1', is_active: true }],
                    total: 1,
                    page: 1,
                    page_size: 20,
                    total_pages: 1,
                    active_count: 1
                })
            });

            const { result } = renderHook(() => useQuestionFunnels({ agentId: 10, isNew: false }));

            await act(async () => {
                await result.current.loadFunnels();
            });

            expect(result.current.funnels.length).toBe(1);
            expect(result.current.totalItems).toBe(1);

            act(() => {
                result.current.openCreateModal();
            });
            expect(result.current.modalState.isOpen).toBe(true);
            expect(result.current.modalState.funnel).toBeNull();

            act(() => {
                result.current.closeFunnelModal();
            });
            expect(result.current.modalState.isOpen).toBe(false);

            act(() => {
                result.current.openDeleteModal({ id: 1, name: 'F1' });
            });
            expect(result.current.deleteModalState.isOpen).toBe(true);

            act(() => {
                result.current.closeDeleteModal();
            });
            expect(result.current.deleteModalState.isOpen).toBe(false);
        });
    });
});

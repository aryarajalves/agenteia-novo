import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import SimulatorBlock from '../../components/KnowledgeBaseManager/components/SimulatorBlock';
import { api } from '../../api/client';

const mockSetSimQuery = vi.fn();
const mockSetSimResults = vi.fn();
const mockSetSimLoading = vi.fn();
const mockReloadKnowledgeBase = vi.fn();
const mockSetItemToEdit = vi.fn();
const mockSetIsEditOpen = vi.fn();

const mockSimResults = {
    items: [
        {
            id: 1,
            question: 'Como funciona o curso?',
            answer: 'O curso é 100% online com acesso vitalício.',
            relevance_score: 0.63,
            category: 'GERAL',
            search_type: 'HYBRID + RERANKED',
            question_variations: ['O curso é online?']
        }
    ],
    discarded_items: [
        {
            id: 2,
            question: 'Como funciona o suporte do curso?',
            answer: 'Você recebe o link do grupo de avisos.',
            relevance_score: 0.42,
            discard_reason: 'O item trata do suporte do curso, que não está relacionado ao funcionamento do boleto.',
            category: 'GERAL',
            question_variations: []
        }
    ],
    usage: {
        prompt_tokens: 850,
        completion_tokens: 150,
        total_tokens: 1000
    }
};

let currentSimLoading = false;
let currentSimResults = mockSimResults;

vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: () => ({
        kbId: 10,
        simQuery: 'como funciona o curso MLD?',
        setSimQuery: mockSetSimQuery,
        simResults: currentSimResults,
        setSimResults: mockSetSimResults,
        simLoading: currentSimLoading,
        setSimLoading: (val) => {
            currentSimLoading = val;
            mockSetSimLoading(val);
        },
        reloadKnowledgeBase: mockReloadKnowledgeBase,
        setItemToEdit: mockSetItemToEdit,
        setIsEditOpen: mockSetIsEditOpen
    })
}));

vi.mock('../../api/client', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn()
    }
}));

describe('SimulatorBlock - Variações de Perguntas e Respostas Descartadas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentSimLoading = false;
        currentSimResults = mockSimResults;
    });

    afterEach(() => {
        cleanup();
    });

    it('renderiza o botão de adicionar variação para os itens encontrados na busca', () => {
        render(<SimulatorBlock />);

        // Pergunta e resposta do item encontrado
        expect(screen.getByText(/1\. Como funciona o curso\?/i)).toBeInTheDocument();
        expect(screen.getByText(/O curso é 100% online com acesso vitalício\./i)).toBeInTheDocument();
        expect(screen.getByText('63%')).toBeInTheDocument();

        // Botão de adicionar variação no card encontrado
        expect(screen.getByTestId('add-var-btn-1')).toBeInTheDocument();
        expect(screen.getByText(/O curso é online\?/i)).toBeInTheDocument();
    });

    it('renderiza as respostas e o botão de adicionar variação para os itens descartados pelos filtros', () => {
        render(<SimulatorBlock />);

        // Cabeçalho de itens descartados com Total explícito
        expect(screen.getByText(/ITENS DESCARTADOS PELOS FILTROS DE IA/i)).toBeInTheDocument();
        expect(screen.getByText(/Total: 1 item/i)).toBeInTheDocument();

        // Pergunta do item descartado
        expect(screen.getByText(/1\. Como funciona o suporte do curso\?/i)).toBeInTheDocument();
        
        // Badge explícito do filtro de IA que descartou (ex: AGENTIC EVAL)
        const filterBadge = screen.getByTestId('discard-filter-badge-2');
        expect(filterBadge).toBeInTheDocument();
        expect(filterBadge).toHaveTextContent(/AGENTIC EVAL/i);

        // RESPOSTA do item descartado (atendendo ao pedido explícito do usuário)
        expect(screen.getByText(/Você recebe o link do grupo de avisos\./i)).toBeInTheDocument();

        // Motivo do descarte
        expect(screen.getByText(/O item trata do suporte do curso/i)).toBeInTheDocument();
        expect(screen.getByText('42%')).toBeInTheDocument();

        // Botão de adicionar variação no card descartado
        expect(screen.getByTestId('add-var-btn-2')).toBeInTheDocument();
    });

    it('renderiza o botão de excluir nos cards de itens encontrados e descartados', () => {
        render(<SimulatorBlock />);

        expect(screen.getByTestId('delete-result-btn-1')).toBeInTheDocument();
        expect(screen.getByTestId('delete-result-btn-2')).toBeInTheDocument();
    });

    it('abre o popup bonito de confirmação ao clicar em Excluir', () => {
        render(<SimulatorBlock />);

        const deleteBtn = screen.getByTestId('delete-result-btn-1');
        fireEvent.click(deleteBtn);

        expect(screen.getByText(/Excluir Item da Base/i)).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja excluir permanentemente o item "Como funciona o curso\?"\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Sim, Excluir/i)).toBeInTheDocument();
        expect(screen.getByText(/Cancelar/i)).toBeInTheDocument();
    });

    it('executa a exclusão com sucesso ao confirmar no popup', async () => {
        api.delete.mockResolvedValueOnce({ ok: true });

        render(<SimulatorBlock />);

        const deleteBtn = screen.getByTestId('delete-result-btn-1');
        fireEvent.click(deleteBtn);

        const confirmBtn = screen.getByText(/Sim, Excluir/i);
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith('/knowledge-items/1');
            expect(mockSetSimResults).toHaveBeenCalled();
            expect(mockReloadKnowledgeBase).toHaveBeenCalled();
        });
    });

    it('exibe o popup de carregamento no centro da tela quando simLoading é true', () => {
        currentSimLoading = true;

        render(<SimulatorBlock />);

        // O popup centralizado deve estar visível com a pergunta atual
        expect(screen.getByTestId('sim-search-loading-modal')).toBeInTheDocument();
        expect(screen.getByText(/Buscando na Base de Conhecimento\.\.\./i)).toBeInTheDocument();
        expect(screen.getByTestId('sim-search-loading-query')).toHaveTextContent(/como funciona o curso MLD\?/i);
    });

    it('ao clicar em Testar Busca ativa o popup de busca e o fecha após o término', async () => {
        api.post.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [],
                discarded_items: []
            })
        });

        render(<SimulatorBlock />);

        const searchBtn = screen.getByText(/▶ Testar Busca/i);
        fireEvent.click(searchBtn);

        // Deve iniciar o loading (abrindo o popup)
        expect(mockSetSimLoading).toHaveBeenCalledWith(true);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/knowledge-bases/10/simulate-rag', expect.objectContaining({
                query: 'como funciona o curso MLD?'
            }));
            // Ao terminar, deve fechar o popup
            expect(mockSetSimLoading).toHaveBeenCalledWith(false);
            expect(mockSetSimResults).toHaveBeenCalled();
        });
    });

    it('exibe o badge de consumo de tokens com o total consumido na busca', () => {
        render(<SimulatorBlock />);

        const badge = screen.getByTestId('sim-token-usage-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent(/1000 tokens consumidos/i);
    });

    it('renderiza o botão de editar nos cards de itens encontrados e descartados', () => {
        render(<SimulatorBlock />);

        expect(screen.getByTestId('edit-result-btn-1')).toBeInTheDocument();
        expect(screen.getByTestId('edit-result-btn-2')).toBeInTheDocument();
    });

    it('ao clicar em Editar em um item encontrado abre o modal de edição', () => {
        render(<SimulatorBlock />);

        const editBtn = screen.getByTestId('edit-result-btn-1');
        fireEvent.click(editBtn);

        expect(mockSetItemToEdit).toHaveBeenCalledWith(mockSimResults.items[0]);
        expect(mockSetIsEditOpen).toHaveBeenCalledWith(true);
    });

    it('ao clicar em Editar em um item descartado abre o modal de edição', () => {
        render(<SimulatorBlock />);

        const editBtn = screen.getByTestId('edit-result-btn-2');
        fireEvent.click(editBtn);

        expect(mockSetItemToEdit).toHaveBeenCalledWith(mockSimResults.discarded_items[0]);
        expect(mockSetIsEditOpen).toHaveBeenCalledWith(true);
    });

    describe('Múltiplas Perguntas (Grouped Results)', () => {
        const mockMultiQueryResults = {
            sub_queries: ['possui certificado do mec ?', 'quem é tarcira ?'],
            grouped_results: [
                {
                    sub_query: 'possui certificado do mec ?',
                    items: [
                        {
                            id: 101,
                            question: 'Tem certificado do MEC?',
                            answer: 'Sim, o curso tem reconhecimento e certificado MEC.',
                            relevance_score: 0.96,
                            category: 'MEC',
                            question_variations: ['O certificado é válido pelo MEC?']
                        }
                    ],
                    discarded_items: [
                        {
                            id: 102,
                            question: 'Quem é a coordenadora?',
                            answer: 'Coordenadora Maria.',
                            relevance_score: 0.35,
                            discard_filter: 'AGENTIC EVAL',
                            discard_reason: 'Trata de coordenação, não de certificado.'
                        }
                    ]
                },
                {
                    sub_query: 'quem é tarcira ?',
                    items: [
                        {
                            id: 201,
                            question: 'Quem é Tarcira Martins?',
                            answer: 'Tarcira Martins é a criadora do método MLD.',
                            relevance_score: 0.98,
                            category: 'PROFESSORA',
                            question_variations: []
                        }
                    ],
                    discarded_items: []
                }
            ],
            usage: {
                prompt_tokens: 1500,
                completion_tokens: 300,
                total_tokens: 1800
            }
        };

        it('renderiza o banner de múltiplas perguntas e separa os blocos de cada pergunta', () => {
            currentSimResults = mockMultiQueryResults;
            render(<SimulatorBlock />);

            // Banner informativo
            expect(screen.getByTestId('multiquery-banner')).toBeInTheDocument();
            expect(screen.getByText(/2 Perguntas Identificadas na Mensagem/i)).toBeInTheDocument();

            // Bloco da Pergunta 1
            const group0 = screen.getByTestId('subquery-group-0');
            expect(group0).toBeInTheDocument();
            expect(group0).toHaveTextContent(/Pergunta 1/i);
            expect(group0).toHaveTextContent(/possui certificado do mec \?/i);
            expect(group0).toHaveTextContent(/Tem certificado do MEC\?/i);
            expect(group0).toHaveTextContent(/Sim, o curso tem reconhecimento e certificado MEC\./i);
            expect(group0).toHaveTextContent(/Quem é a coordenadora\?/i);

            // Bloco da Pergunta 2
            const group1 = screen.getByTestId('subquery-group-1');
            expect(group1).toBeInTheDocument();
            expect(group1).toHaveTextContent(/Pergunta 2/i);
            expect(group1).toHaveTextContent(/quem é tarcira \?/i);
            expect(group1).toHaveTextContent(/Quem é Tarcira Martins\?/i);
            expect(group1).toHaveTextContent(/Tarcira Martins é a criadora do método MLD\./i);
        });

        it('no bloco agrupado, o botão de adicionar variação passa o defaultQuery da respectiva pergunta', () => {
            currentSimResults = mockMultiQueryResults;
            render(<SimulatorBlock />);

            // Pergunta 1: item 101 tem botão de variação pré-preenchido com 'possui certificado do mec ?'
            const addVarBtn101 = screen.getByTestId('add-var-btn-101');
            expect(addVarBtn101).toBeInTheDocument();

            fireEvent.click(addVarBtn101);
            const input101 = screen.getByTestId('var-input-101');
            expect(input101.value).toBe('possui certificado do mec ?');

            // Pergunta 2: item 201 tem botão de variação pré-preenchido com 'quem é tarcira ?'
            const addVarBtn201 = screen.getByTestId('add-var-btn-201');
            expect(addVarBtn201).toBeInTheDocument();

            fireEvent.click(addVarBtn201);
            const input201 = screen.getByTestId('var-input-201');
            expect(input201.value).toBe('quem é tarcira ?');
        });

        it('permite editar um item encontrado em um bloco agrupado', () => {
            currentSimResults = mockMultiQueryResults;
            render(<SimulatorBlock />);

            const editBtn201 = screen.getByTestId('edit-result-btn-201');
            fireEvent.click(editBtn201);

            expect(mockSetItemToEdit).toHaveBeenCalledWith(mockMultiQueryResults.grouped_results[1].items[0]);
            expect(mockSetIsEditOpen).toHaveBeenCalledWith(true);
        });

        it('permite abrir confirmação de exclusão de um item em um bloco agrupado', () => {
            currentSimResults = mockMultiQueryResults;
            render(<SimulatorBlock />);

            const deleteBtn201 = screen.getByTestId('delete-result-btn-201');
            fireEvent.click(deleteBtn201);

            expect(screen.getByText(/Tem certeza que deseja excluir permanentemente o item "Quem é Tarcira Martins\?"\?/i)).toBeInTheDocument();
        });
    });
});

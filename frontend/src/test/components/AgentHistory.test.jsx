import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { groupAndSortSessions } from '../../components/AgentHistory/agentHistoryHelpers';
import AgentHistoryHeader from '../../components/AgentHistory/AgentHistoryHeader';
import SessionCard from '../../components/AgentHistory/SessionCard';
import AgentHistory from '../../components/AgentHistory';

// Mock da API para isolar chamadas de rede
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
        })),
        post: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({})
        }))
    }
}));

describe('AgentHistory & Modular Components', () => {
    describe('groupAndSortSessions Helper', () => {
        it('deve retornar array vazio se o historico for vazio ou invalido', () => {
            expect(groupAndSortSessions([])).toEqual([]);
            expect(groupAndSortSessions(null)).toEqual([]);
            expect(groupAndSortSessions(undefined)).toEqual([]);
        });

        it('deve agrupar mensagens por session_id e calcular total de custo e tokens', () => {
            const mockLogs = [
                {
                    id: 1,
                    session_id: 'sess_1',
                    timestamp: '2026-09-18T10:00:00',
                    cost_brl: 0.05,
                    input_tokens: 100,
                    output_tokens: 50,
                    user_message: 'Oi',
                    agent_response: 'Olá!'
                },
                {
                    id: 2,
                    session_id: 'sess_1',
                    timestamp: '2026-09-18T10:05:00',
                    cost_brl: 0.07,
                    input_tokens: 120,
                    output_tokens: 80,
                    user_message: 'Tudo bem?',
                    agent_response: 'Tudo ótimo!'
                },
                {
                    id: 3,
                    session_id: 'sess_2',
                    timestamp: '2026-09-18T11:00:00',
                    cost_brl: 0.10,
                    input_tokens: 200,
                    output_tokens: 100,
                    user_message: 'Preço?',
                    agent_response: 'R$ 100'
                }
            ];

            const grouped = groupAndSortSessions(mockLogs);
            expect(grouped).toHaveLength(2);

            // sess_2 é a mais recente (11:00 > 10:05), deve vir primeiro
            expect(grouped[0].id).toBe('sess_2');
            expect(grouped[0].totalCost).toBeCloseTo(0.10);
            expect(grouped[0].totalTokens).toBe(300);

            // sess_1 deve vir em segundo com totalCost somado e totalTokens somado
            expect(grouped[1].id).toBe('sess_1');
            expect(grouped[1].totalCost).toBeCloseTo(0.12);
            expect(grouped[1].totalTokens).toBe(350);
            expect(grouped[1].interactions).toHaveLength(2);
        });
    });

    describe('AgentHistoryHeader Component', () => {
        it('deve renderizar o cabeçalho básico sem botões de lote quando nada estiver selecionado', () => {
            render(
                <AgentHistoryHeader
                    selectedSessions={new Set()}
                    sortedSessions={[{ id: 'sess_1' }, { id: 'sess_2' }]}
                    handleSelectAll={vi.fn()}
                    extractBatchQuestions={vi.fn()}
                    onOpenDeleteModal={vi.fn()}
                />
            );

            expect(screen.getByText('Conversas Agrupadas por Sessão')).toBeInTheDocument();
            expect(screen.queryByText(/Extrair Perguntas/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Deletar/i)).not.toBeInTheDocument();
        });

        it('deve renderizar ações em lote quando houver sessões selecionadas', () => {
            const onOpenDeleteModal = vi.fn();
            const extractBatchQuestions = vi.fn();

            render(
                <AgentHistoryHeader
                    selectedSessions={new Set(['sess_1'])}
                    sortedSessions={[{ id: 'sess_1' }, { id: 'sess_2' }]}
                    handleSelectAll={vi.fn()}
                    extractBatchQuestions={extractBatchQuestions}
                    onOpenDeleteModal={onOpenDeleteModal}
                />
            );

            const extractBtn = screen.getByText(/Extrair Perguntas \(1\)/i);
            const deleteBtn = screen.getByText(/Deletar \(1\)/i);

            expect(extractBtn).toBeInTheDocument();
            expect(deleteBtn).toBeInTheDocument();

            fireEvent.click(extractBtn);
            expect(extractBatchQuestions).toHaveBeenCalledTimes(1);

            fireEvent.click(deleteBtn);
            expect(onOpenDeleteModal).toHaveBeenCalledTimes(1);
        });
    });

    describe('SessionCard Component', () => {
        const mockSession = {
            id: 'sessao_teste_123',
            startTime: '2026-09-18T12:00:00',
            totalCost: 0.15,
            totalTokens: 250,
            interactions: [
                {
                    id: 'msg_1',
                    timestamp: '2026-09-18T12:00:00',
                    user_message: 'Como funciona o teste?',
                    agent_response: 'O teste valida todos os componentes.',
                    model_used: 'gpt-4o',
                    input_tokens: 150,
                    output_tokens: 100,
                    cost_brl: 0.15
                }
            ]
        };

        it('deve renderizar cabeçalho da sessão recolhido', () => {
            const onToggleExpand = vi.fn();
            const onToggleSelect = vi.fn();

            render(
                <SessionCard
                    session={mockSession}
                    isExpanded={false}
                    onToggleExpand={onToggleExpand}
                    isSelected={false}
                    onToggleSelect={onToggleSelect}
                    summary={null}
                    isLoadingSummary={false}
                    onSummarize={vi.fn()}
                />
            );

            expect(screen.getByText(/sessao_t.../i)).toBeInTheDocument();
            expect(screen.getByText('1 msg')).toBeInTheDocument();
            expect(screen.getByText('R$ 0.15')).toBeInTheDocument();
            expect(screen.getByText('250 tokens')).toBeInTheDocument();
            expect(screen.queryByText('Como funciona o teste?')).not.toBeInTheDocument();
        });

        it('deve exibir interações e botão de resumo quando expandido', () => {
            const onSummarize = vi.fn();

            render(
                <SessionCard
                    session={mockSession}
                    isExpanded={true}
                    onToggleExpand={vi.fn()}
                    isSelected={false}
                    onToggleSelect={vi.fn()}
                    summary={null}
                    isLoadingSummary={false}
                    onSummarize={onSummarize}
                />
            );

            expect(screen.getByText('Como funciona o teste?')).toBeInTheDocument();
            expect(screen.getByText('O teste valida todos os componentes.')).toBeInTheDocument();
            expect(screen.getByText(/IA \(gpt-4o\)/i)).toBeInTheDocument();

            const summarizeBtn = screen.getByRole('button', { name: /Resumir Conversa/i });
            fireEvent.click(summarizeBtn);
            expect(onSummarize).toHaveBeenCalledTimes(1);
        });

        it('deve exibir o resumo da conversa quando summary estiver preenchido', () => {
            const mockSummary = {
                summary: 'Conversa focada em testes automatizados.',
                is_cached: true,
                usage: { total_tokens: 120 },
                cost_brl: 0.02
            };

            render(
                <SessionCard
                    session={mockSession}
                    isExpanded={true}
                    onToggleExpand={vi.fn()}
                    isSelected={false}
                    onToggleSelect={vi.fn()}
                    summary={mockSummary}
                    isLoadingSummary={false}
                    onSummarize={vi.fn()}
                />
            );

            expect(screen.getByText('Conversa focada em testes automatizados.')).toBeInTheDocument();
            expect(screen.getByText(/RECUPERADO DO BANCO/i)).toBeInTheDocument();
        });
    });

    describe('AgentHistory Main Flow', () => {
        it('deve exibir mensagem para salvar o agente quando agentId for new ou ausente', () => {
            render(<AgentHistory agentId="new" />);
            expect(screen.getByText(/Salve o agente primeiro/i)).toBeInTheDocument();
        });
    });
});


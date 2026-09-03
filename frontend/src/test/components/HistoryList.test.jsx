import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HistoryList from '../../components/ChatPlayground/components/Sidebar/HistoryList';

describe('HistoryList Component com Paginação', () => {
    const mockSessions = Array.from({ length: 45 }, (_, i) => ({
        session_id: `session-${i + 1}`,
        agent_name: 'Agente Tarcira',
        summary: `Resumo da conversa ${i + 1}`,
        cost_brl: 0.05,
        updated_at: '2026-09-01T10:00:00.000Z',
        is_test_session: i % 2 === 0
    }));

    it('deve exibir no máximo 20 conversas na primeira página', () => {
        render(
            <HistoryList
                sessions={mockSessions}
                historyFilter="all"
                setHistoryFilter={vi.fn()}
                isSelectionMode={false}
                toggleSelectionMode={vi.fn()}
                selectedSessions={new Set()}
                toggleSelectAll={vi.fn()}
                setShowDeleteConfirm={vi.fn()}
                extractBatchQuestions={vi.fn()}
                toggleSessionSelection={vi.fn()}
                loadSession={vi.fn()}
                currentSessionId="session-1"
            />
        );

        // Deve mostrar a contagem de 1 a 20 de 45
        expect(screen.getByText(/Exibindo 1–20 de 45/i)).toBeInTheDocument();
        expect(screen.getByText('Pág. 1 / 3')).toBeInTheDocument();
        expect(screen.getByText('Resumo da conversa 1')).toBeInTheDocument();
        expect(screen.getByText('Resumo da conversa 20')).toBeInTheDocument();
        expect(screen.queryByText('Resumo da conversa 21')).not.toBeInTheDocument();
    });

    it('deve avançar para a página 2 ao clicar em Próxima', () => {
        render(
            <HistoryList
                sessions={mockSessions}
                historyFilter="all"
                setHistoryFilter={vi.fn()}
                isSelectionMode={false}
                toggleSelectionMode={vi.fn()}
                selectedSessions={new Set()}
                toggleSelectAll={vi.fn()}
                setShowDeleteConfirm={vi.fn()}
                extractBatchQuestions={vi.fn()}
                toggleSessionSelection={vi.fn()}
                loadSession={vi.fn()}
                currentSessionId="session-1"
            />
        );

        const nextBtn = screen.getByTestId('history-page-next');
        fireEvent.click(nextBtn);

        expect(screen.getByText(/Exibindo 21–40 de 45/i)).toBeInTheDocument();
        expect(screen.getByText('Pág. 2 / 3')).toBeInTheDocument();
        expect(screen.getByText('Resumo da conversa 21')).toBeInTheDocument();
        expect(screen.queryByText('Resumo da conversa 1')).not.toBeInTheDocument();
    });

    it('deve desabilitar botão anterior na primeira página', () => {
        render(
            <HistoryList
                sessions={mockSessions}
                historyFilter="all"
                setHistoryFilter={vi.fn()}
                isSelectionMode={false}
                toggleSelectionMode={vi.fn()}
                selectedSessions={new Set()}
                toggleSelectAll={vi.fn()}
                setShowDeleteConfirm={vi.fn()}
                extractBatchQuestions={vi.fn()}
                toggleSessionSelection={vi.fn()}
                loadSession={vi.fn()}
                currentSessionId="session-1"
            />
        );

        const prevBtn = screen.getByTestId('history-page-prev');
        expect(prevBtn).toBeDisabled();
    });
});

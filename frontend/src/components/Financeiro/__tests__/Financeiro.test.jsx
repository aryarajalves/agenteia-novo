/**
 * Testes Unitários — Página Financeiro
 * Cobre: KPI cards, toggle de viewMode, seletor de período, paginação, badges da tabela
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock do contexto financeiro
const mockContextValue = {
    report: {
        items: [
            {
                date: '2026-04-01',
                agent_name: 'Agente Alpha',
                unique_sessions: 10,
                total_tokens: 5000,
                avg_cost_per_message: 0.002,
                total_cost: 1.50,
                isFtJob: false,
            },
            {
                date: '2026-04-02',
                agent_name: 'Agente Beta',
                unique_sessions: 5,
                total_tokens: 2000,
                avg_cost_per_message: 0.001,
                total_cost: 0.80,
                isFtJob: false,
            },
        ],
        grand_total_cost: 2.30,
    },
    ftJobs: [],
    loading: false,
    period: '7d',
    setPeriod: vi.fn(),
    viewMode: 'agents',
    setViewMode: vi.fn(),
    customDates: { start: '', end: '' },
    setCustomDates: vi.fn(),
    selectedMonth: 3,
    setSelectedMonth: vi.fn(),
    selectedYear: 2026,
    setSelectedYear: vi.fn(),
    currentPage: 1,
    setCurrentPage: vi.fn(),
    rowsPerPage: 20,
    setRowsPerPage: vi.fn(),
};

vi.mock('../FinanceContext', () => ({
    useFinance: () => mockContextValue,
    FinanceProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../hooks/useFinanceMetrics', () => ({
    useFinanceMetrics: () => ({
        activeRowsData: mockContextValue.report.items,
        activeTotalCost: 2.30,
        ranking: [
            { name: 'Agente Alpha', cost: 1.50 },
            { name: 'Agente Beta',  cost: 0.80 },
        ],
        chartData: [
            { date: '2026-04-01', cost: 1.50 },
            { date: '2026-04-02', cost: 0.80 },
        ],
    }),
}));

// ── Imports dos componentes (depois dos mocks) ─────────────────────────────────
import FinanceHeader    from '../components/FinanceHeader';
import PeriodSelector   from '../components/PeriodSelector';
import StatsOverview    from '../components/StatsOverview';
import TransactionTable from '../components/TransactionTable';

// ── Helpers ────────────────────────────────────────────────────────────────────
const renderWithContext = (Component) => render(<Component />);

// ==============================================================================
//  FinanceHeader
// ==============================================================================
describe('FinanceHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza o título "Financeiro 💰"', () => {
        renderWithContext(FinanceHeader);
        expect(screen.getByText(/Financeiro/i)).toBeTruthy();
    });

    it('renderiza os 4 KPI cards', () => {
        renderWithContext(FinanceHeader);
        expect(document.getElementById('total-gasto')).toBeTruthy();
        expect(document.getElementById('tokens-totais')).toBeTruthy();
        expect(document.getElementById('sessoes')).toBeTruthy();
        expect(document.getElementById('custo-medio')).toBeTruthy();
    });

    it('KPI "Total Gasto" exibe o valor correto', () => {
        renderWithContext(FinanceHeader);
        expect(screen.getByText('R$ 2.30')).toBeTruthy();
    });

    it('KPI "Custo Médio/Sessão" exibe o valor formatado com 2 casas decimais', () => {
        renderWithContext(FinanceHeader);
        expect(screen.getByText('R$ 0.15')).toBeTruthy();
    });

    it('KPI "Tokens Totais" exibe soma de tokens', () => {
        renderWithContext(FinanceHeader);
        // 5000 + 2000 = 7000
        expect(screen.getByText('7.000')).toBeTruthy();
    });
});

// ==============================================================================
//  PeriodSelector
// ==============================================================================
describe('PeriodSelector', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renderiza os 3 botões de período rápido', () => {
        renderWithContext(PeriodSelector);
        expect(document.getElementById('btn-period-today')).toBeTruthy();
        expect(document.getElementById('btn-period-7d')).toBeTruthy();
        expect(document.getElementById('btn-period-30d')).toBeTruthy();
    });

    it('botão "7 dias" tem classe active (period === 7d)', () => {
        renderWithContext(PeriodSelector);
        const btn = document.getElementById('btn-period-7d');
        expect(btn.className).toContain('active');
    });

    it('clique em "Hoje" chama setPeriod com "today"', () => {
        renderWithContext(PeriodSelector);
        fireEvent.click(document.getElementById('btn-period-today'));
        expect(mockContextValue.setPeriod).toHaveBeenCalledWith('today');
    });

    it('clique em "30 dias" chama setPeriod com "30d"', () => {
        renderWithContext(PeriodSelector);
        fireEvent.click(document.getElementById('btn-period-30d'));
        expect(mockContextValue.setPeriod).toHaveBeenCalledWith('30d');
    });

    it('select de mês existe e chama setPeriod "monthly"', () => {
        renderWithContext(PeriodSelector);
        const sel = document.getElementById('select-month');
        expect(sel).toBeTruthy();
        fireEvent.change(sel, { target: { value: '5' } });
        expect(mockContextValue.setPeriod).toHaveBeenCalledWith('monthly');
    });

    it('inputs de data customizada existem', () => {
        renderWithContext(PeriodSelector);
        expect(document.getElementById('input-date-start')).toBeTruthy();
        expect(document.getElementById('input-date-end')).toBeTruthy();
    });
});

// ==============================================================================
//  StatsOverview
// ==============================================================================
describe('StatsOverview', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renderiza o card de gráfico', () => {
        renderWithContext(StatsOverview);
        expect(document.getElementById('chart-tendencia')).toBeTruthy();
    });

    it('renderiza o card de total com classe "agents"', () => {
        renderWithContext(StatsOverview);
        const card = document.getElementById('card-total');
        expect(card.className).toContain('agents');
    });

    it('exibe o total correto no card', () => {
        renderWithContext(StatsOverview);
        expect(screen.getByText('R$ 2.30')).toBeTruthy();
    });

    it('renderiza o ranking com 2 items', () => {
        renderWithContext(StatsOverview);
        expect(document.getElementById('ranking-item-0')).toBeTruthy();
        expect(document.getElementById('ranking-item-1')).toBeTruthy();
    });

    it('ranking exibe "Agente Alpha" como 1º', () => {
        renderWithContext(StatsOverview);
        expect(screen.getByText(/1º Agente Alpha/)).toBeTruthy();
    });
});

// ==============================================================================
//  TransactionTable
// ==============================================================================
describe('TransactionTable', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renderiza o contêiner da tabela', () => {
        renderWithContext(TransactionTable);
        expect(document.getElementById('transaction-table')).toBeTruthy();
    });

    it('exibe o badge de contagem de registros', () => {
        renderWithContext(TransactionTable);
        expect(screen.getByText('2 registros')).toBeTruthy();
    });

    it('renderiza linhas para cada item da página', () => {
        renderWithContext(TransactionTable);
        expect(document.getElementById('row-0')).toBeTruthy();
        expect(document.getElementById('row-1')).toBeTruthy();
    });

    it('exibe "Agente Alpha" na primeira linha', () => {
        renderWithContext(TransactionTable);
        expect(screen.getByTitle('Agente Alpha')).toBeTruthy();
    });

    it('exibe o custo médio por mensagem formatado com 2 casas decimais na tabela', () => {
        renderWithContext(TransactionTable);
        const elements = screen.getAllByText('R$ 0.00');
        expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it('exibe badges AG para agentes normais', () => {
        renderWithContext(TransactionTable);
        const badges = document.querySelectorAll('.agent-badge.type-agent');
        expect(badges.length).toBe(2);
    });

    it('controles de paginação existem', () => {
        renderWithContext(TransactionTable);
        expect(document.getElementById('btn-prev-page')).toBeTruthy();
        expect(document.getElementById('btn-next-page')).toBeTruthy();
        expect(document.getElementById('page-indicator')).toBeTruthy();
    });

    it('botão "Anterior" está desabilitado na página 1', () => {
        renderWithContext(TransactionTable);
        const btn = document.getElementById('btn-prev-page');
        expect(btn.disabled).toBe(true);
    });

    it('select de rows-per-page chama setRowsPerPage ao mudar', () => {
        renderWithContext(TransactionTable);
        const sel = document.getElementById('select-rows-per-page');
        fireEvent.change(sel, { target: { value: '50' } });
        expect(mockContextValue.setRowsPerPage).toHaveBeenCalledWith(50);
    });

    it('indicador de página exibe "1 / 1"', () => {
        renderWithContext(TransactionTable);
        expect(screen.getByText('1 / 1')).toBeTruthy();
    });

    it('exibe badge RAG e formata custo reduzido quando o item for do Simulador RAG', () => {
        const originalItems = mockContextValue.report.items;
        mockContextValue.report.items = [
            {
                date: '2026-04-03',
                agent_name: 'Simulador RAG (gpt-4o-mini)',
                unique_sessions: 1,
                total_tokens: 1150,
                avg_cost_per_message: 0.0005,
                total_cost: 0.0005,
                isFtJob: false,
            }
        ];

        renderWithContext(TransactionTable);

        // Deve renderizar badge com texto RAG e classe type-rag
        const ragBadge = document.querySelector('.agent-badge.type-rag');
        expect(ragBadge).toBeTruthy();
        expect(ragBadge.textContent.trim()).toBe('RAG');

        // Deve exibir o nome do simulador e quantidade de tokens
        expect(screen.getByTitle('Simulador RAG (gpt-4o-mini)')).toBeTruthy();
        expect(screen.getByText('1.150')).toBeTruthy();

        // Custo menor que 1 centavo deve ser formatado como < R$ 0.01
        expect(screen.getByText('< R$ 0.01')).toBeTruthy();

        // Restaura mock
        mockContextValue.report.items = originalItems;
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LeadSelectionBar from '../../components/WebhookManager/components/LeadSelectionBar';

describe('LeadSelectionBar Component', () => {
    const mockLeads = [
        { id: 1, telefone: '5511999991111' },
        { id: 2, telefone: '5511999992222' }
    ];

    it('deve permitir selecionar e desmarcar a página atual', () => {
        const toggleSelectAllLeads = vi.fn();
        render(
            <LeadSelectionBar
                safeLeads={mockLeads}
                total={2}
                selectedLeads={new Set()}
                toggleSelectAllLeads={toggleSelectAllLeads}
                onSelectAllTotal={vi.fn()}
                onClearSelection={vi.fn()}
                onBulkDelete={vi.fn()}
            />
        );

        const selectAllText = screen.getByText('Selecionar Todos');
        expect(selectAllText).toBeInTheDocument();

        fireEvent.click(selectAllText);
        expect(toggleSelectAllLeads).toHaveBeenCalledTimes(1);
    });

    it('deve exibir botão para selecionar todos os contatos do total quando total > page', () => {
        const onSelectAllTotal = vi.fn();
        render(
            <LeadSelectionBar
                safeLeads={mockLeads}
                total={111}
                selectedLeads={new Set([1, 2])}
                toggleSelectAllLeads={vi.fn()}
                onSelectAllTotal={onSelectAllTotal}
                onClearSelection={vi.fn()}
                onBulkDelete={vi.fn()}
            />
        );

        const btnSelectTotal = screen.getByText(/Selecionar todos os 111 contatos/i);
        expect(btnSelectTotal).toBeInTheDocument();

        fireEvent.click(btnSelectTotal);
        expect(onSelectAllTotal).toHaveBeenCalledTimes(1);
    });

    it('deve exibir aviso de todos selecionados quando total selecionado', () => {
        const onClearSelection = vi.fn();
        const fakeAll = new Set(Array.from({ length: 111 }, (_, i) => i + 1));
        render(
            <LeadSelectionBar
                safeLeads={mockLeads}
                total={111}
                selectedLeads={fakeAll}
                toggleSelectAllLeads={vi.fn()}
                onSelectAllTotal={vi.fn()}
                onClearSelection={onClearSelection}
                onBulkDelete={vi.fn()}
            />
        );

        expect(screen.getByText(/Todos os 111 contatos selecionados/i)).toBeInTheDocument();
        const btnClear = screen.getByText('Desmarcar todos');
        fireEvent.click(btnClear);
        expect(onClearSelection).toHaveBeenCalledTimes(1);
    });

    it('deve disparar onBulkDelete ao clicar em Excluir Selecionados', () => {
        const onBulkDelete = vi.fn();
        render(
            <LeadSelectionBar
                safeLeads={mockLeads}
                total={111}
                selectedLeads={new Set([1])}
                toggleSelectAllLeads={vi.fn()}
                onSelectAllTotal={vi.fn()}
                onClearSelection={vi.fn()}
                onBulkDelete={onBulkDelete}
            />
        );

        const btnDelete = screen.getByText('🗑️ Excluir Selecionados');
        fireEvent.click(btnDelete);
        expect(onBulkDelete).toHaveBeenCalledTimes(1);
    });
});

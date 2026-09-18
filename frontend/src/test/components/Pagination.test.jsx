import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../../components/ConfigPanel/components/QuestionFunnels/Pagination';

describe('Pagination Component', () => {
    it('não renderiza nada quando totalItems é 0 ou negativo', () => {
        const { container } = render(
            <Pagination currentPage={1} totalPages={1} totalItems={0} pageSize={20} onPageChange={() => {}} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o resumo de itens corretamente para página 1 com 45 itens', () => {
        render(
            <Pagination currentPage={1} totalPages={3} totalItems={45} pageSize={20} onPageChange={() => {}} />
        );

        expect(screen.getByText(/1–20/)).toBeInTheDocument();
        expect(screen.getByText(/45/)).toBeInTheDocument();
        expect(screen.getByText(/\(20 por página\)/)).toBeInTheDocument();
    });

    it('renderiza o resumo correto para a última página', () => {
        render(
            <Pagination currentPage={3} totalPages={3} totalItems={45} pageSize={20} onPageChange={() => {}} />
        );

        expect(screen.getByText(/41–45/)).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('desabilita botão Anterior na página 1 e Próxima na última página', () => {
        const { rerender } = render(
            <Pagination currentPage={1} totalPages={3} totalItems={45} pageSize={20} onPageChange={() => {}} />
        );

        const btnPrev = screen.getByLabelText('Página Anterior');
        const btnNext = screen.getByLabelText('Próxima Página');

        expect(btnPrev).toBeDisabled();
        expect(btnNext).not.toBeDisabled();

        // Rerender na página final
        rerender(
            <Pagination currentPage={3} totalPages={3} totalItems={45} pageSize={20} onPageChange={() => {}} />
        );

        expect(screen.getByLabelText('Página Anterior')).not.toBeDisabled();
        expect(screen.getByLabelText('Próxima Página')).toBeDisabled();
    });

    it('chama onPageChange com a página correta ao clicar em Próxima e nos números de página', () => {
        const handlePageChange = vi.fn();
        render(
            <Pagination currentPage={1} totalPages={3} totalItems={45} pageSize={20} onPageChange={handlePageChange} />
        );

        fireEvent.click(screen.getByLabelText('Próxima Página'));
        expect(handlePageChange).toHaveBeenCalledWith(2);

        fireEvent.click(screen.getByLabelText('Página 3'));
        expect(handlePageChange).toHaveBeenCalledWith(3);
    });
});

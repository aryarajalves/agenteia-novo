import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AlternateQueriesInput from '../../components/ConfigPanel/components/Modals/AlternateQueriesInput';

describe('AlternateQueriesInput Component', () => {
    it('deve renderizar a lista de variações passadas por props', () => {
        const queries = ['quanto custa?', 'qual o valor?'];
        render(<AlternateQueriesInput queries={queries} onChange={vi.fn()} />);

        expect(screen.getByText('quanto custa?')).toBeInTheDocument();
        expect(screen.getByText('qual o valor?')).toBeInTheDocument();
    });

    it('deve permitir adicionar nova variação clicando no botão ou teclando Enter', () => {
        const mockOnChange = vi.fn();
        render(<AlternateQueriesInput queries={['quanto custa?']} onChange={mockOnChange} testIdInput="test-alt-input" testIdAddBtn="test-add-btn" />);

        const input = screen.getByTestId('test-alt-input');
        const addBtn = screen.getByTestId('test-add-btn');

        // Adicionando via clique
        fireEvent.change(input, { target: { value: 'tem desconto?' } });
        fireEvent.click(addBtn);

        expect(mockOnChange).toHaveBeenCalledWith(['quanto custa?', 'tem desconto?']);

        // Adicionando via Enter
        fireEvent.change(input, { target: { value: 'qual a forma de pagamento?' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockOnChange).toHaveBeenCalledWith(['quanto custa?', 'qual a forma de pagamento?']);
    });

    it('não deve permitir adicionar variações duplicadas ou em branco', () => {
        const mockOnChange = vi.fn();
        render(<AlternateQueriesInput queries={['quanto custa?']} onChange={mockOnChange} testIdInput="test-alt-input" testIdAddBtn="test-add-btn" />);

        const input = screen.getByTestId('test-alt-input');
        const addBtn = screen.getByTestId('test-add-btn');

        // Tentar duplicata com case diferente
        fireEvent.change(input, { target: { value: 'QUANTO CUSTA?' } });
        fireEvent.click(addBtn);
        expect(mockOnChange).not.toHaveBeenCalled();

        // Tentar texto em branco
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.click(addBtn);
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('deve permitir editar uma variação existente inline com Enter ou botão Salvar', () => {
        const mockOnChange = vi.fn();
        render(<AlternateQueriesInput queries={['quanto custa?', 'como comprar?']} onChange={mockOnChange} />);

        // Clica no botão de editar da primeira variação (index 0)
        const editBtn = screen.getByTestId('alt-query-edit-btn-0');
        fireEvent.click(editBtn);

        // O campo inline de edição deve aparecer
        const editInput = screen.getByTestId('alt-query-edit-input-0');
        expect(editInput).toBeInTheDocument();
        expect(editInput.value).toBe('quanto custa?');

        // Altera o texto e salva com Enter
        fireEvent.change(editInput, { target: { value: 'quanto custa o curso hoje?' } });
        fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' });

        expect(mockOnChange).toHaveBeenCalledWith(['quanto custa o curso hoje?', 'como comprar?']);
    });

    it('deve cancelar edição inline se pressionar Escape', () => {
        render(<AlternateQueriesInput queries={['quanto custa?']} onChange={vi.fn()} />);

        const editBtn = screen.getByTestId('alt-query-edit-btn-0');
        fireEvent.click(editBtn);

        const editInput = screen.getByTestId('alt-query-edit-input-0');
        fireEvent.change(editInput, { target: { value: 'texto cancelado' } });
        fireEvent.keyDown(editInput, { key: 'Escape', code: 'Escape' });

        // O input inline some e o texto original continua
        expect(screen.queryByTestId('alt-query-edit-input-0')).toBeNull();
        expect(screen.getByText('quanto custa?')).toBeInTheDocument();
    });

    it('deve permitir remover uma variação ao clicar no botão de lixeira/excluir', () => {
        const mockOnChange = vi.fn();
        render(<AlternateQueriesInput queries={['quanto custa?', 'como comprar?']} onChange={mockOnChange} />);

        const deleteBtn = screen.getByTestId('alt-query-remove-btn-0');
        fireEvent.click(deleteBtn);

        expect(mockOnChange).toHaveBeenCalledWith(['como comprar?']);
    });
});

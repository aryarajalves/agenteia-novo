import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import QuestionVariationsInput from '../../components/KnowledgeBaseManager/components/QuestionVariationsInput';

describe('QuestionVariationsInput Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renderiza o estado vazio quando não há variações', () => {
        render(<QuestionVariationsInput variations={[]} onChange={vi.fn()} />);

        expect(screen.getByText(/Variações da Pergunta/i)).toBeInTheDocument();
        expect(screen.getByText(/0\/8 variações/i)).toBeInTheDocument();
        expect(screen.getByText(/Nenhuma variação adicionada/i)).toBeInTheDocument();
    });

    it('renderiza a lista de variações existentes corretamente', () => {
        const variations = ['Quem dá o curso?', 'Qual o professor?'];
        render(<QuestionVariationsInput variations={variations} onChange={vi.fn()} />);

        expect(screen.getByText(/2\/8 variações/i)).toBeInTheDocument();
        expect(screen.getByText('Quem dá o curso?')).toBeInTheDocument();
        expect(screen.getByText('Qual o professor?')).toBeInTheDocument();
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('adiciona nova variação ao clicar no botão + Adicionar', () => {
        const mockOnChange = vi.fn();
        render(<QuestionVariationsInput variations={['Variação 1']} onChange={mockOnChange} />);

        const input = screen.getByTestId('kb-variation-input');
        const addBtn = screen.getByTestId('kb-variation-add-btn');

        fireEvent.change(input, { target: { value: 'Nova Variação 2' } });
        fireEvent.click(addBtn);

        expect(mockOnChange).toHaveBeenCalledWith(['Variação 1', 'Nova Variação 2']);
    });

    it('adiciona nova variação ao pressionar Enter', () => {
        const mockOnChange = vi.fn();
        render(<QuestionVariationsInput variations={[]} onChange={mockOnChange} />);

        const input = screen.getByTestId('kb-variation-input');
        fireEvent.change(input, { target: { value: 'Quem é o tutor?' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockOnChange).toHaveBeenCalledWith(['Quem é o tutor?']);
    });

    it('remove uma variação ao clicar no botão ✕', () => {
        const mockOnChange = vi.fn();
        const variations = ['Variação A', 'Variação B', 'Variação C'];
        render(<QuestionVariationsInput variations={variations} onChange={mockOnChange} />);

        const removeBtn = screen.getByTestId('remove-variation-1'); // Remove 'Variação B'
        fireEvent.click(removeBtn);

        expect(mockOnChange).toHaveBeenCalledWith(['Variação A', 'Variação C']);
    });

    it('não permite adicionar variação duplicada (case-insensitive)', () => {
        const mockOnChange = vi.fn();
        const variations = ['Quem dá o curso?'];
        render(<QuestionVariationsInput variations={variations} onChange={mockOnChange} />);

        const input = screen.getByTestId('kb-variation-input');
        const addBtn = screen.getByTestId('kb-variation-add-btn');

        fireEvent.change(input, { target: { value: 'quem dá o curso?' } });
        fireEvent.click(addBtn);

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('desativa botões e input quando a prop disabled é true', () => {
        render(<QuestionVariationsInput variations={['Variação 1']} onChange={vi.fn()} disabled={true} />);

        const input = screen.getByTestId('kb-variation-input');
        const addBtn = screen.getByTestId('kb-variation-add-btn');
        const removeBtn = screen.getByTestId('remove-variation-0');

        expect(input).toBeDisabled();
        expect(addBtn).toBeDisabled();
        expect(removeBtn).toBeDisabled();
    });

    it('bloqueia adição e exibe aviso pedagógico quando atinge o limite máximo de 8 variações', () => {
        const mockOnChange = vi.fn();
        const maxVariations = Array.from({ length: 8 }, (_, i) => `Variação ${i + 1}`);

        render(<QuestionVariationsInput variations={maxVariations} onChange={mockOnChange} />);

        // Badge de contagem com indicação de máximo
        expect(screen.getByText(/8\/8 variações \(Máximo\)/i)).toBeInTheDocument();

        // Alerta explicativo do porquê do limite
        const limitMsg = screen.getByTestId('kb-variations-limit-msg');
        expect(limitMsg).toBeInTheDocument();
        expect(limitMsg).toHaveTextContent(/Limite máximo de 8 variações atingido/i);
        expect(limitMsg).toHaveTextContent(/diluição semântica do vetor/i);

        // Input e botão bloqueados
        const input = screen.getByTestId('kb-variation-input');
        const addBtn = screen.getByTestId('kb-variation-add-btn');
        expect(input).toBeDisabled();
        expect(addBtn).toBeDisabled();

        // Permite remover uma das variações existentes
        const removeBtn = screen.getByTestId('remove-variation-0');
        fireEvent.click(removeBtn);
        expect(mockOnChange).toHaveBeenCalledWith(maxVariations.slice(1));
    });
});

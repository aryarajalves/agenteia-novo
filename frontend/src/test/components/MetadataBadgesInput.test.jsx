import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import MetadataBadgesInput from '../../components/KnowledgeBaseManager/components/MetadataBadgesInput';

describe('MetadataBadgesInput Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renderiza o campo vazio com o placeholder configurado', () => {
        render(<MetadataBadgesInput value="" onChange={vi.fn()} placeholder="Ex: forma de pagamento" />);

        expect(screen.getByText('Metadado')).toBeInTheDocument();
        const input = screen.getByPlaceholderText('Ex: forma de pagamento');
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('');
    });

    it('converte string separada por " | " em múltiplos badges visuais', () => {
        render(
            <MetadataBadgesInput 
                value="forma de pagamento | boleto bancário | parcelamento" 
                onChange={vi.fn()} 
            />
        );

        expect(screen.getByText('(3 metadados)')).toBeInTheDocument();
        expect(screen.getByText('forma de pagamento')).toBeInTheDocument();
        expect(screen.getByText('boleto bancário')).toBeInTheDocument();
        expect(screen.getByText('parcelamento')).toBeInTheDocument();
        expect(screen.getByTestId('metadata-badge-0')).toBeInTheDocument();
        expect(screen.getByTestId('metadata-badge-1')).toBeInTheDocument();
        expect(screen.getByTestId('metadata-badge-2')).toBeInTheDocument();
    });

    it('adiciona novo badge ao digitar e pressionar a tecla Enter', () => {
        const mockOnChange = vi.fn();
        render(
            <MetadataBadgesInput 
                value="forma de pagamento" 
                onChange={mockOnChange} 
            />
        );

        const input = screen.getByTestId('metadata-badges-input');
        fireEvent.change(input, { target: { value: 'boleto à vista' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockOnChange).toHaveBeenCalledWith('forma de pagamento | boleto à vista');
        expect(input.value).toBe('');
    });

    it('não adiciona metadado duplicado (case-insensitive)', () => {
        const mockOnChange = vi.fn();
        render(
            <MetadataBadgesInput 
                value="forma de pagamento" 
                onChange={mockOnChange} 
            />
        );

        const input = screen.getByTestId('metadata-badges-input');
        fireEvent.change(input, { target: { value: 'FORMA DE PAGAMENTO' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockOnChange).not.toHaveBeenCalled();
        expect(input.value).toBe('');
    });

    it('remove um badge ao clicar no botão ✕ correspondente', () => {
        const mockOnChange = vi.fn();
        render(
            <MetadataBadgesInput 
                value="tag1 | tag2 | tag3" 
                onChange={mockOnChange} 
            />
        );

        const removeBtn = screen.getByTestId('remove-metadata-1'); // remove tag2
        fireEvent.click(removeBtn);

        expect(mockOnChange).toHaveBeenCalledWith('tag1 | tag3');
    });

    it('remove o último badge ao pressionar Backspace com o input vazio', () => {
        const mockOnChange = vi.fn();
        render(
            <MetadataBadgesInput 
                value="financeiro | checkout" 
                onChange={mockOnChange} 
            />
        );

        const input = screen.getByTestId('metadata-badges-input');
        expect(input.value).toBe('');
        fireEvent.keyDown(input, { key: 'Backspace', code: 'Backspace' });

        expect(mockOnChange).toHaveBeenCalledWith('financeiro');
    });

    it('divide texto colado que contenha barras verticais "|" em múltiplos badges', () => {
        const mockOnChange = vi.fn();
        render(
            <MetadataBadgesInput 
                value="curso" 
                onChange={mockOnChange} 
            />
        );

        const input = screen.getByTestId('metadata-badges-input');
        fireEvent.change(input, { target: { value: 'módulo 1 | módulo 2' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockOnChange).toHaveBeenCalledWith('curso | módulo 1 | módulo 2');
    });
});

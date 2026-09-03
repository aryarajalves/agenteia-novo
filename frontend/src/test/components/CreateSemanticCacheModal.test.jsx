import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateSemanticCacheModal from '../../components/ConfigPanel/components/Modals/CreateSemanticCacheModal';

describe('CreateSemanticCacheModal Component', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    it('não deve renderizar nada se isOpen for falso', () => {
        const { container } = render(
            <CreateSemanticCacheModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} isSaving={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar campos para criação manual de pergunta e resposta', () => {
        render(
            <CreateSemanticCacheModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} isSaving={false} />
        );

        expect(screen.getByText(/Cadastrar Nova Resposta no Cache/i)).toBeInTheDocument();
        expect(screen.getByTestId('create-cache-query-input')).toBeInTheDocument();
        expect(screen.getByTestId('create-cache-response-input')).toBeInTheDocument();
        expect(screen.getByTestId('create-cache-alt-input')).toBeInTheDocument();
        expect(screen.getByTestId('create-add-alt-btn')).toBeInTheDocument();
    });

    it('deve permitir adicionar variações e salvar a nova resposta no cache', () => {
        render(
            <CreateSemanticCacheModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} isSaving={false} />
        );

        const queryInput = screen.getByTestId('create-cache-query-input');
        const responseInput = screen.getByTestId('create-cache-response-input');
        const altInput = screen.getByTestId('create-cache-alt-input');
        const addAltBtn = screen.getByTestId('create-add-alt-btn');
        const saveBtn = screen.getByTestId('save-create-cache-btn');

        fireEvent.change(queryInput, { target: { value: 'quanto custa o curso?' } });
        fireEvent.change(responseInput, { target: { value: 'O curso custa R$297.' } });

        fireEvent.change(altInput, { target: { value: 'qual o valor do investimento?' } });
        fireEvent.click(addAltBtn);

        expect(screen.getByText(/qual o valor do investimento\?/i)).toBeInTheDocument();

        fireEvent.click(saveBtn);

        expect(mockOnSave).toHaveBeenCalledWith({
            user_query: 'quanto custa o curso?',
            approved_response: 'O curso custa R$297.',
            alternate_queries: ['qual o valor do investimento?'],
            similarity_threshold: null,
            category_tag: null
        });
    });

    it('deve permitir configurar limiar individual de similaridade personalizado e tag de produto', () => {
        render(
            <CreateSemanticCacheModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} isSaving={false} defaultThreshold={85} />
        );

        const queryInput = screen.getByTestId('create-cache-query-input');
        const responseInput = screen.getByTestId('create-cache-response-input');
        const tagInput = screen.getByTestId('input-category-tag');
        const customModeBtn = screen.getByTestId('threshold-mode-custom-btn');
        const saveBtn = screen.getByTestId('save-create-cache-btn');

        fireEvent.change(queryInput, { target: { value: 'quanto custa?' } });
        fireEvent.change(responseInput, { target: { value: 'R$ 297' } });
        fireEvent.change(tagInput, { target: { value: 'Método Laser Day' } });

        // Selecionar modo personalizado
        fireEvent.click(customModeBtn);

        const slider = screen.getByTestId('cache-threshold-slider');
        fireEvent.change(slider, { target: { value: '98' } });

        fireEvent.click(saveBtn);

        expect(mockOnSave).toHaveBeenCalledWith({
            user_query: 'quanto custa?',
            approved_response: 'R$ 297',
            alternate_queries: [],
            similarity_threshold: 0.98,
            category_tag: 'Método Laser Day'
        });
    });

    it('deve abrir popup gigante de tela cheia ao clicar no botão de maximizar campo', () => {
        render(
            <CreateSemanticCacheModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} isSaving={false} />
        );

        const maximizeBtn = screen.getByTestId('toggle-maximize-create-response-btn');
        fireEvent.click(maximizeBtn);

        expect(screen.getByText(/Edição expandida e confortável da resposta oficial/i)).toBeInTheDocument();
    });
});

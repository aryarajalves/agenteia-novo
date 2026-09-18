import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AddItemForm from '../../components/KnowledgeBaseManager/components/AddItemForm';
import React from 'react';

// Mock the context and hook
vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: vi.fn(() => ({
        kbLabels: { question: 'Pergunta', answer: 'Resposta', metadata: 'Metadado' },
        kbType: 'qa'
    }))
}));

const mockHandleAddItem = vi.fn();
vi.mock('../../components/KnowledgeBaseManager/hooks/useKBOperations', () => ({
    useKBOperations: vi.fn(() => ({
        handleAddItem: mockHandleAddItem
    }))
}));

describe('AddItemForm - Metadata Tags System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve permitir adicionar multiplos metadados como tags separadas e enviar formatado', () => {
        render(<AddItemForm />);

        // O label de metadado deve existir
        expect(screen.getByText('Metadado')).toBeInTheDocument();

        // Encontra o input de tag
        const tagInput = screen.getByPlaceholderText('Ex: PAINEL INICIAL | Chat (Enter)');
        expect(tagInput).toBeInTheDocument();

        // Escreve e adiciona a primeira tag
        fireEvent.change(tagInput, { target: { value: 'Painel Inicial' } });
        fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

        // A tag deve ser renderizada na tela
        expect(screen.getByText('Painel Inicial')).toBeInTheDocument();

        // Escreve e adiciona a segunda tag
        fireEvent.change(tagInput, { target: { value: 'WhatsApp' } });
        fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

        expect(screen.getByText('WhatsApp')).toBeInTheDocument();

        // Preenche os outros campos
        const questionInput = screen.getByPlaceholderText('Ex: Qual o horário de funcionamento?');
        const answerInput = screen.getByPlaceholderText('Ex: O horário é...');
        
        fireEvent.change(questionInput, { target: { value: 'Pergunta 1' } });
        fireEvent.change(answerInput, { target: { value: 'Resposta 1' } });

        // Clica no botão de adicionar à base
        const addButton = screen.getByText('✓ Adicionar à Base');
        fireEvent.click(addButton);

        // O mock deve ter sido chamado com os metadados unidos por ' | '
        expect(mockHandleAddItem).toHaveBeenCalledWith({
            question: 'Pergunta 1',
            answer: 'Resposta 1',
            metadata_val: 'Painel Inicial | WhatsApp',
            category: 'Geral',
            question_variations: []
        });
    });
});

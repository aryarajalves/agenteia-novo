import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionFunnelModal from '../../components/ConfigPanel/components/QuestionFunnels/QuestionFunnelModal';

// Mock api client
vi.mock('../../../../api/client', () => ({
    api: {
        post: vi.fn()
    }
}));

describe('QuestionFunnelModal Component', () => {
    const defaultProps = {
        isOpen: true,
        funnel: null,
        onSave: vi.fn(),
        onClose: vi.fn(),
        loading: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('não renderiza quando isOpen é false', () => {
        const { container } = render(<QuestionFunnelModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renderiza os campos padrão no modo de criação', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        expect(screen.getByText('Novo Funil por Dúvida')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Apresentação Principal/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/como funciona o curso de vcs\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Sensibilidade Semântica/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Criar Funil/i })).toBeInTheDocument();
    });

    it('exibe erro de validação se tentar salvar sem nome ou pergunta', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const saveButton = screen.getByRole('button', { name: /Criar Funil/i });
        fireEvent.click(saveButton);

        expect(screen.getByText(/Informe um nome de identificação para o funil/i)).toBeInTheDocument();
        expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('permite preencher e submeter o formulário corretamente', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const nameInput = screen.getByPlaceholderText(/Apresentação Principal/i);
        const questionInput = screen.getByPlaceholderText(/como funciona o curso de vcs\?/i);

        fireEvent.change(nameInput, { target: { value: 'Funil Matrícula' } });
        fireEvent.change(questionInput, { target: { value: 'quanto custa o curso?' } });

        const saveButton = screen.getByRole('button', { name: /Criar Funil/i });
        fireEvent.click(saveButton);

        expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
        expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Funil Matrícula',
            trigger_question: 'quanto custa o curso?',
            frequency_mode: 'once_per_lead'
        }));
    });

    it('permite adicionar e remover variações de perguntas', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const variationInput = screen.getByPlaceholderText(/Ex: me explica como é as aulas/i);
        const addVarButton = screen.getByRole('button', { name: /\+ Adicionar/i });

        fireEvent.change(variationInput, { target: { value: 'qual o preco?' } });
        fireEvent.click(addVarButton);

        const variationBadge = screen.getByText(/"qual o preco\?"/i);
        expect(variationBadge).toBeInTheDocument();

        // Remover variação clicando no botão dentro do badge
        const removeButton = variationBadge.querySelector('button');
        fireEvent.click(removeButton);
        expect(screen.queryByText(/"qual o preco\?"/i)).toBeNull();
    });

    it('chama onClose ao clicar no botão de fechar ou cancelar', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const closeBtn = screen.getByText(/Cancelar/i);
        fireEvent.click(closeBtn);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});

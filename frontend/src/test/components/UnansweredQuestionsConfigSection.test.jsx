import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UnansweredQuestionsConfigSection from '../../components/ConfigPanel/components/UnansweredQuestionsConfigSection';
import { ConfigContext } from '../../components/ConfigPanel/ConfigContext';

const renderWithContext = (initialValues = {}) => {
    const defaultContext = {
        unansweredHandoffEnabled: true,
        setUnansweredHandoffEnabled: vi.fn(),
        unansweredHandoffLimit: 2,
        setUnansweredHandoffLimit: vi.fn(),
        unansweredQuestionPrompt: '',
        setUnansweredQuestionPrompt: vi.fn(),
        ...initialValues
    };

    return {
        ...render(
            <ConfigContext.Provider value={defaultContext}>
                <UnansweredQuestionsConfigSection />
            </ConfigContext.Provider>
        ),
        context: defaultContext
    };
};

describe('UnansweredQuestionsConfigSection Component', () => {
    it('deve renderizar o título e controles de dúvidas sem resposta', () => {
        renderWithContext();

        expect(screen.getByText('Dúvidas Sem Resposta & Transbordo Humano')).toBeInTheDocument();
        expect(screen.getByText('Transferência Ativa (2x)')).toBeInTheDocument();
        expect(screen.getByText(/Transferir para suporte humano após limite/i)).toBeInTheDocument();
        expect(screen.getByText(/Diretriz \/ Modelo de Resposta ao Registrar Dúvida/i)).toBeInTheDocument();
    });

    it('deve alternar o switch de transbordo chamando setUnansweredHandoffEnabled', () => {
        const setUnansweredHandoffEnabled = vi.fn();
        renderWithContext({ setUnansweredHandoffEnabled });

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();

        fireEvent.click(checkbox);
        expect(setUnansweredHandoffEnabled).toHaveBeenCalledWith(false);
    });

    it('deve exibir o badge de Modo 100% Robô quando o transbordo estiver desativado', () => {
        renderWithContext({ unansweredHandoffEnabled: false });

        expect(screen.getByText('🛡️ Nunca Transferir por Dúvida')).toBeInTheDocument();
        expect(screen.getByText(/Modo 100% Robô Ativo/i)).toBeInTheDocument();
        expect(screen.queryByText(/Quantidade de dúvidas sem resposta antes de transferir/i)).not.toBeInTheDocument();
    });

    it('deve permitir alterar o limite de dúvidas via botões rápidos', () => {
        const setUnansweredHandoffLimit = vi.fn();
        renderWithContext({ unansweredHandoffLimit: 2, setUnansweredHandoffLimit });

        const btn3 = screen.getByRole('button', { name: /3 dúvidas/i });
        fireEvent.click(btn3);

        expect(setUnansweredHandoffLimit).toHaveBeenCalledWith(3);
    });

    it('deve permitir preencher o modelo de resposta via sugestões rápidas', () => {
        const setUnansweredQuestionPrompt = vi.fn();
        renderWithContext({ setUnansweredQuestionPrompt });

        const presetBtn = screen.getByText(/Vou verificar essa informação com nossa equipe/i);
        fireEvent.click(presetBtn);

        expect(setUnansweredQuestionPrompt).toHaveBeenCalledWith(
            'Vou verificar essa informação com nossa equipe e já te retorno por aqui!'
        );
    });

    it('deve atualizar o texto do prompt customizado ao digitar', () => {
        const setUnansweredQuestionPrompt = vi.fn();
        renderWithContext({ unansweredQuestionPrompt: '', setUnansweredQuestionPrompt });

        const textarea = screen.getByPlaceholderText(/Ex: Diga educadamente que vai verificar/i);
        fireEvent.change(textarea, { target: { value: 'Minha instrução personalizada' } });

        expect(setUnansweredQuestionPrompt).toHaveBeenCalledWith('Minha instrução personalizada');
    });
});

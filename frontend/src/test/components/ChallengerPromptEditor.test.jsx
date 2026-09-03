import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChallengerPromptEditor from '../../components/ChatPlayground/components/ChallengerPromptEditor';

describe('ChallengerPromptEditor Component', () => {
    it('deve renderizar o título, textarea e badge de tokens', () => {
        render(
            <ChallengerPromptEditor
                value="Você é um assistente de vendas agressivo."
                onChange={vi.fn()}
                onBackToChat={vi.fn()}
                mainAgentPrompt="Você é uma assistente prestativa."
                agentName="Tarcira"
            />
        );

        expect(screen.getByText('Prompt do Desafiante (Arena A/B)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Você é um assistente de vendas agressivo.')).toBeInTheDocument();
        expect(screen.getByText(/tokens/i)).toBeInTheDocument();
    });

    it('deve permitir copiar o prompt original do agente principal', () => {
        const onChangeMock = vi.fn();
        render(
            <ChallengerPromptEditor
                value=""
                onChange={onChangeMock}
                onBackToChat={vi.fn()}
                mainAgentPrompt="Prompt original do agente Tarcira"
                agentName="Tarcira"
            />
        );

        const copyBtn = screen.getByText(/Copiar Prompt de Tarcira/i);
        fireEvent.click(copyBtn);
        expect(onChangeMock).toHaveBeenCalledWith('Prompt original do agente Tarcira');
    });

    it('deve chamar onBackToChat ao clicar no botão de voltar para a Arena', () => {
        const onBackMock = vi.fn();
        render(
            <ChallengerPromptEditor
                value="teste"
                onChange={vi.fn()}
                onBackToChat={onBackMock}
                mainAgentPrompt=""
                agentName="Tarcira"
            />
        );

        const backBtn = screen.getByText(/Ir para o Chat da Arena/i);
        fireEvent.click(backBtn);
        expect(onBackMock).toHaveBeenCalled();
    });
});

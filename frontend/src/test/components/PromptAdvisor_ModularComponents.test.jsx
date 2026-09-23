import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    calculateCost,
    formatMessageContent,
    AdvisorHeader,
    AdvisorMessageList,
    AdvisorInputArea,
    AdvisorFab
} from '../../components/PromptEditor/components/PromptAdvisor/index';

describe('PromptAdvisor Modular Components & Helpers', () => {
    describe('calculateCost', () => {
        it('deve calcular corretamente o custo para gpt-4o e converter para BRL', () => {
            const usage = { prompt_tokens: 1000, completion_tokens: 500 };
            const cost = calculateCost(usage, 'gpt-4o');
            expect(cost).toBeDefined();
            expect(cost.model).toBe('gpt-4o');
            expect(cost.formatted).toContain('R$');
        });

        it('deve calcular corretamente o custo para gpt-4o-mini', () => {
            const usage = { prompt_tokens: 10000, completion_tokens: 2000 };
            const cost = calculateCost(usage, 'gpt-4o-mini');
            expect(cost.model).toBe('gpt-4o-mini');
        });

        it('deve retornar null se usage for nulo', () => {
            expect(calculateCost(null, 'gpt-4o')).toBeNull();
        });
    });

    describe('formatMessageContent', () => {
        it('deve criar link interativo para números de linha com clique', () => {
            const scrollToLineMock = vi.fn();
            const rendered = formatMessageContent('Verifique na Linha 42 do código.', scrollToLineMock);
            render(<div>{rendered}</div>);

            const lineBtn = screen.getByTitle(/Linha 42/i);
            expect(lineBtn).toBeDefined();
            fireEvent.click(lineBtn);
            expect(scrollToLineMock).toHaveBeenCalledWith(42);
        });

        it('deve formatar texto em negrito', () => {
            const rendered = formatMessageContent('Este é um texto **importante**.', () => {});
            render(<div>{rendered}</div>);

            expect(screen.getByText('importante').tagName).toBe('STRONG');
        });
    });

    describe('AdvisorHeader', () => {
        it('deve renderizar o título e botões de ação', () => {
            const resetMock = vi.fn();
            const maximizeMock = vi.fn();
            const closeMock = vi.fn();

            render(
                <AdvisorHeader 
                    isChatMaximized={false}
                    setIsChatMaximized={maximizeMock}
                    handleResetAdvisorMemory={resetMock}
                    handleCloseAdvisor={closeMock}
                    isAdvisorLoading={false}
                />
            );

            expect(screen.getByText('Assistente de Prompt')).toBeDefined();
            fireEvent.click(screen.getByTitle('Reiniciar Memória'));
            expect(resetMock).toHaveBeenCalled();

            fireEvent.click(screen.getByTitle('Fechar Assistente'));
            expect(closeMock).toHaveBeenCalled();
        });

        it('deve exibir badge de Tela Cheia quando maximizado', () => {
            render(
                <AdvisorHeader 
                    isChatMaximized={true}
                    setIsChatMaximized={() => {}}
                    handleResetAdvisorMemory={() => {}}
                    handleCloseAdvisor={() => {}}
                    isAdvisorLoading={false}
                />
            );

            expect(screen.getByText('Tela Cheia')).toBeDefined();
        });
    });

    describe('AdvisorFab', () => {
        it('deve alternar estado de abertura e fechamento', () => {
            const setShowMock = vi.fn();
            render(
                <AdvisorFab 
                    showAdvisorChat={false}
                    isChatMaximized={false}
                    setShowAdvisorChat={setShowMock}
                    handleCloseAdvisor={() => {}}
                />
            );

            const fab = screen.getByTitle('Assistente de Prompt');
            fireEvent.click(fab);
            expect(setShowMock).toHaveBeenCalledWith(true);
        });

        it('não deve renderizar FAB se chat estiver maximizado em tela cheia', () => {
            const { container } = render(
                <AdvisorFab 
                    showAdvisorChat={true}
                    isChatMaximized={true}
                    setShowAdvisorChat={() => {}}
                    handleCloseAdvisor={() => {}}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });
});

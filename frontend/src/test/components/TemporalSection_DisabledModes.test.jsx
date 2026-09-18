import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemporalSection from '../../components/ConfigPanel/components/TemporalSection';
import { ConfigContext } from '../../components/ConfigPanel/ConfigContext';

describe('TemporalSection - Modos Desativados de Saudação e Continuação', () => {
    const createMockContext = (overrides = {}) => ({
        initialMessage: 'Olá! Como posso ajudar?',
        setInitialMessage: vi.fn(),
        initialQuestionMessage: 'Possui mais alguma dúvida?',
        setInitialQuestionMessage: vi.fn(),
        greetingMode: 'panel',
        setGreetingMode: vi.fn(),
        questionMode: 'panel',
        setQuestionMode: vi.fn(),
        dateAwareness: true,
        setDateAwareness: vi.fn(),
        dateAwarenessPastDays: 7,
        setDateAwarenessPastDays: vi.fn(),
        dateAwarenessFutureDays: 30,
        setDateAwarenessFutureDays: vi.fn(),
        simulatedTime: '',
        setSimulatedTime: vi.fn(),
        ...overrides
    });

    const renderWithContext = (contextValue) => {
        return render(
            <ConfigContext.Provider value={contextValue}>
                <TemporalSection />
            </ConfigContext.Provider>
        );
    };

    it('renderiza os botões 🚫 Desativado para saudação e continuação', () => {
        const context = createMockContext();
        renderWithContext(context);

        const disabledGreetingBtn = screen.getByTestId('btn-greeting-mode-disabled');
        const disabledQuestionBtn = screen.getByTestId('btn-question-mode-disabled');

        expect(disabledGreetingBtn).toBeInTheDocument();
        expect(disabledGreetingBtn).toHaveTextContent('🚫 Desativado');

        expect(disabledQuestionBtn).toBeInTheDocument();
        expect(disabledQuestionBtn).toHaveTextContent('🚫 Desativado');
    });

    it('ao clicar em 🚫 Desativado na saudação inicial, chama setGreetingMode com "disabled"', () => {
        const setGreetingModeMock = vi.fn();
        const context = createMockContext({ setGreetingMode: setGreetingModeMock });
        renderWithContext(context);

        const disabledGreetingBtn = screen.getByTestId('btn-greeting-mode-disabled');
        fireEvent.click(disabledGreetingBtn);

        expect(setGreetingModeMock).toHaveBeenCalledTimes(1);
        expect(setGreetingModeMock).toHaveBeenCalledWith('disabled');
    });

    it('ao clicar em 🚫 Desativado na continuação após 1ª dúvida, chama setQuestionMode com "disabled"', () => {
        const setQuestionModeMock = vi.fn();
        const context = createMockContext({ setQuestionMode: setQuestionModeMock });
        renderWithContext(context);

        const disabledQuestionBtn = screen.getByTestId('btn-question-mode-disabled');
        fireEvent.click(disabledQuestionBtn);

        expect(setQuestionModeMock).toHaveBeenCalledTimes(1);
        expect(setQuestionModeMock).toHaveBeenCalledWith('disabled');
    });

    it('exibe alerta explicativo quando greetingMode é "disabled"', () => {
        const context = createMockContext({ greetingMode: 'disabled' });
        renderWithContext(context);

        expect(screen.getByText(/Saudação Inicial Desativada:/i)).toBeInTheDocument();
        expect(screen.queryByTestId('input-initial-message')).not.toBeInTheDocument();
    });

    it('exibe alerta explicativo quando questionMode é "disabled"', () => {
        const context = createMockContext({ questionMode: 'disabled' });
        renderWithContext(context);

        expect(screen.getByText(/Continuação Desativada:/i)).toBeInTheDocument();
        expect(screen.queryByTestId('input-initial-question-message')).not.toBeInTheDocument();
    });
});


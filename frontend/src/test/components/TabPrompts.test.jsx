import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TabPrompts from '../../components/ConfigPanel/components/TabPrompts';

// Mock do cliente API
const mockApi = {
    get: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['etiqueta1', 'etiqueta2'])
    })),
    post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
};

vi.mock('../../../api/client', () => ({
    api: mockApi
}));

// Mock do Contexto de Configuração
const mockSetQualificationQuestions = vi.fn();
const mockSetQualificationLabels = vi.fn();
const mockSetSystemPrompt = vi.fn();
const mockSetInitialMessage = vi.fn();
const mockSetInitialQuestionMessage = vi.fn();
const mockSetInitialIgnoreMessage = vi.fn();
const mockSetDateAwareness = vi.fn();
const mockSetSimulatedTime = vi.fn();
const mockSetGreetingMode = vi.fn();
const mockSetQuestionMode = vi.fn();

const mockConfigValues = {
    id: '1',
    isNew: false,
    systemPrompt: 'Prompt de teste',
    setSystemPrompt: mockSetSystemPrompt,
    routerEnabled: false,
    routerComplexModel: 'gpt-4o',
    selectedModel: 'gpt-4o-mini',
    initialMessage: 'Olá!',
    setInitialMessage: mockSetInitialMessage,
    initialQuestionMessage: 'Qual sua dúvida?',
    setInitialQuestionMessage: mockSetInitialQuestionMessage,
    initialIgnoreMessage: [],
    setInitialIgnoreMessage: mockSetInitialIgnoreMessage,
    greetingMode: 'prompt',
    setGreetingMode: mockSetGreetingMode,
    questionMode: 'panel',
    setQuestionMode: mockSetQuestionMode,
    qualificationQuestions: [
        { text: 'Qual seu nome?', instruction: 'Validar nome completo' },
        { text: 'Qual seu e-mail?', instruction: '' }
    ],
    setQualificationQuestions: mockSetQualificationQuestions,
    qualificationLabels: ['Lead-Qualificado'],
    setQualificationLabels: mockSetQualificationLabels,
    dateAwareness: false,
    setDateAwareness: mockSetDateAwareness,
    dateAwarenessPastDays: 7,
    setDateAwarenessPastDays: vi.fn(),
    dateAwarenessFutureDays: 7,
    setDateAwarenessFutureDays: vi.fn(),
    simulatedTime: '',
    setSimulatedTime: mockSetSimulatedTime,
    toolsList: [{ id: 'tool_qualif', name: 'lead_qualificado' }],
    selectedTools: ['tool_qualif']
};

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigValues
}));

describe('TabPrompts Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset config questions
        mockConfigValues.qualificationQuestions = [
            { text: 'Qual seu nome?', instruction: 'Validar nome completo' },
            { text: 'Qual seu e-mail?', instruction: '' }
        ];
    });

    it('deve alternar entre as sub-abas do Editor Prompt (Prompts, Qualificação, Temporal)', () => {
        render(<TabPrompts />);

        // Inicialmente na sub-aba de Prompts
        expect(screen.getByTestId('subtab-prompts-editor')).toBeInTheDocument();
        expect(screen.getByTestId('subtab-prompts-qualification')).toBeInTheDocument();
        expect(screen.getByTestId('subtab-prompts-temporal')).toBeInTheDocument();

        // Alterna para Funil de Qualificação
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        expect(screen.getByText(/Qual seu nome\?/i)).toBeInTheDocument();

        // Alterna para Saudação & Temporal
        fireEvent.click(screen.getByTestId('subtab-prompts-temporal'));
        expect(screen.getByText(/Comportamento da Saudação Inicial/i)).toBeInTheDocument();
        expect(screen.getByText(/Ativar Consciência Temporal/i)).toBeInTheDocument();

        // Volta para Prompts
        fireEvent.click(screen.getByTestId('subtab-prompts-editor'));
    });

    it('deve renderizar a lista de perguntas de qualificação corretamente na sub-aba de qualificação', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        expect(screen.getByText(/Qual seu nome\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Qual seu e-mail\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Validar nome completo/i)).toBeInTheDocument();
    });

    it('deve entrar no modo de edição inline ao clicar em uma pergunta', async () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        const questionText = screen.getByText(/🎯 Qual seu nome\?/i);
        fireEvent.click(questionText);

        // O input de edição deve estar visível com o valor correspondente
        const input = screen.getByDisplayValue('Qual seu nome?');
        expect(input).toBeInTheDocument();

        // O campo de prompt para a IA também deve estar visível
        const labelPrompt = screen.getByText(/Prompt \/ Diretriz da Pergunta para a IA:/i);
        expect(labelPrompt).toBeInTheDocument();

        const textareaPrompt = screen.getByDisplayValue('Validar nome completo');
        expect(textareaPrompt).toBeInTheDocument();
    });

    it('deve salvar as edições de texto e instrução ao clicar em confirmar (✓)', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        const questionText = screen.getByText(/🎯 Qual seu nome\?/i);
        fireEvent.click(questionText);

        const input = screen.getByDisplayValue('Qual seu nome?');
        fireEvent.change(input, { target: { value: 'Qual seu nome completo?' } });

        const textareaPrompt = screen.getByDisplayValue('Validar nome completo');
        fireEvent.change(textareaPrompt, { target: { value: 'Exigir nome e sobrenome' } });

        const saveBtn = screen.getByTitle('Salvar alteração');
        fireEvent.click(saveBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith([
            expect.objectContaining({
                title: 'Qual seu nome completo?',
                prompt: 'Exigir nome e sobrenome',
                text: 'Qual seu nome completo?',
                instruction: 'Exigir nome e sobrenome'
            }),
            { text: 'Qual seu e-mail?', instruction: '' }
        ]);
    });

    it('deve cancelar as edições e fechar os campos ao clicar em cancelar (✗)', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        const questionText = screen.getByText(/🎯 Qual seu nome\?/i);
        fireEvent.click(questionText);

        const cancelBtn = screen.getByTitle('Cancelar');
        fireEvent.click(cancelBtn);

        expect(screen.queryByDisplayValue('Qual seu nome completo?')).not.toBeInTheDocument();
        expect(screen.getByText(/🎯 Qual seu nome\?/i)).toBeInTheDocument();
        expect(mockSetQualificationQuestions).not.toHaveBeenCalled();
    });

    it('deve abrir o modal de confirmação de exclusão ao clicar no botão da lixeira', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        // Modal deve estar visível
        expect(screen.getByText('Você tem certeza que deseja apagar esta etapa de qualificação?')).toBeInTheDocument();
        expect(screen.getByText('"Qual seu nome?"')).toBeInTheDocument();
    });

    it('deve confirmar a exclusão ao clicar em sim no modal', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        const confirmBtn = screen.getByText('Sim, Apagar');
        fireEvent.click(confirmBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith([
            { text: 'Qual seu e-mail?', instruction: '' }
        ]);
        expect(screen.queryByText('Você tem certeza que deseja apagar esta etapa de qualificação?')).not.toBeInTheDocument();
    });

    it('deve cancelar a exclusão ao clicar em cancelar no modal', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-qualification'));
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        const cancelBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelBtn);

        expect(mockSetQualificationQuestions).not.toHaveBeenCalled();
        expect(screen.queryByText('Você tem certeza que deseja apagar esta etapa de qualificação?')).not.toBeInTheDocument();
    });

    it('deve abrir o modal explicativo de consciência temporal ao clicar no botão de interrogação ❓', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-temporal'));
        
        const helpBtn = screen.getByTitle('Saiba mais sobre a Consciência Temporal');
        expect(helpBtn).toBeInTheDocument();
        
        fireEvent.click(helpBtn);
        
        expect(screen.getByText(/Entendendo as Opções Temporais/)).toBeInTheDocument();
        expect(screen.getAllByText(/Ativar Consciência Temporal/).length).toBeGreaterThan(1);
        expect(screen.getByText(/Forçar Horário Específico/)).toBeInTheDocument();
    });

    it('deve alternar o modo de saudação inicial entre Prompt e Painel', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-temporal'));

        const btnPrompt = screen.getByTestId('btn-greeting-mode-prompt');
        const btnPanel = screen.getByTestId('btn-greeting-mode-panel');

        expect(btnPrompt).toBeInTheDocument();
        expect(btnPanel).toBeInTheDocument();

        fireEvent.click(btnPanel);
        expect(mockSetGreetingMode).toHaveBeenCalledWith('panel');

        fireEvent.click(btnPrompt);
        expect(mockSetGreetingMode).toHaveBeenCalledWith('prompt');
    });

    it('deve alternar o modo de continuação após 1ª dúvida e atualizar o texto fixo', () => {
        render(<TabPrompts />);
        fireEvent.click(screen.getByTestId('subtab-prompts-temporal'));

        expect(screen.getByText(/Continuação após 1ª Dúvida Respondida/i)).toBeInTheDocument();

        const btnQPrompt = screen.getByTestId('btn-question-mode-prompt');
        const btnQPanel = screen.getByTestId('btn-question-mode-panel');

        fireEvent.click(btnQPrompt);
        expect(mockSetQuestionMode).toHaveBeenCalledWith('prompt');

        fireEvent.click(btnQPanel);
        expect(mockSetQuestionMode).toHaveBeenCalledWith('panel');

        const input = screen.getByTestId('input-initial-question-message');
        expect(input).toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'Qual é o seu nome?' } });
        expect(mockSetInitialQuestionMessage).toHaveBeenCalledWith('Qual é o seu nome?');
    });
});

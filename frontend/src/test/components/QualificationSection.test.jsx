import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import QualificationSection from '../../components/ConfigPanel/components/QualificationSection';

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

const mockSetQualificationQuestions = vi.fn();
const mockSetQualificationLabels = vi.fn();
const mockSetQualificationCriteria = vi.fn();
const mockSetQualificationFinalAction = vi.fn();
const mockSetQualificationFunnels = vi.fn();
const mockSetActiveFunnelId = vi.fn();

const mockConfigValues = {
    id: '1',
    isNew: false,
    qualificationFunnels: [
        {
            id: 'funnel_default',
            name: 'Padrão / Principal',
            is_default: true,
            questions: [
                { title: 'Experiência', prompt: 'Descobrir se o lead já atua na área', criteria: 'Sim ou Não', text: 'Experiência', instruction: 'Descobrir se o lead já atua na área' },
                { title: 'Aparelho', prompt: 'Verificar se tem laser próprio', criteria: '', text: 'Aparelho', instruction: 'Verificar se tem laser próprio' }
            ],
            labels: ['Lead-Qualificado'],
            criteria: 'Classifique quente se score >= 8',
            final_action: 'Pergunte se eu posso enviar o link do curso para ele.',
            final_action_trigger: 'all'
        }
    ],
    setQualificationFunnels: mockSetQualificationFunnels,
    activeFunnelId: 'funnel_default',
    setActiveFunnelId: mockSetActiveFunnelId,
    qualificationQuestions: [
        { title: 'Experiência', prompt: 'Descobrir se o lead já atua na área', criteria: 'Sim ou Não', text: 'Experiência', instruction: 'Descobrir se o lead já atua na área' },
        { title: 'Aparelho', prompt: 'Verificar se tem laser próprio', criteria: '', text: 'Aparelho', instruction: 'Verificar se tem laser próprio' }
    ],
    setQualificationQuestions: mockSetQualificationQuestions,
    qualificationLabels: ['Lead-Qualificado'],
    setQualificationLabels: mockSetQualificationLabels,
    qualificationCriteria: 'Classifique quente se score >= 8',
    setQualificationCriteria: mockSetQualificationCriteria,
    qualificationFinalAction: 'Pergunte se eu posso enviar o link do curso para ele.',
    setQualificationFinalAction: mockSetQualificationFinalAction,
    qualificationFinalActionTrigger: 'all',
    setQualificationFinalActionTrigger: vi.fn(),
    toolsList: [{ id: 't1', name: 'lead_qualificado' }],
    selectedTools: ['t1']
};

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigValues
}));

describe('QualificationSection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar a barra de múltiplos funis e as etapas do funil ativo', () => {
        render(<QualificationSection />);
        expect(screen.getByText(/Funil de Qualificação Ativo/i)).toBeInTheDocument();
        expect(screen.getByText(/Etapas de Sondagem do Funil Ativo/i)).toBeInTheDocument();
        expect(screen.getByText(/🎯 Experiência/i)).toBeInTheDocument();
        expect(screen.getByText(/Descobrir se o lead já atua na área/i)).toBeInTheDocument();
        expect(screen.getByText(/🎯 Aparelho/i)).toBeInTheDocument();
    });

    it('deve abrir o modal ao clicar em Nova Etapa / Prompt e cadastrar uma nova etapa', () => {
        render(<QualificationSection />);
        
        const openFormBtn = screen.getByText(/➕ Nova Etapa \/ Prompt/i);
        fireEvent.click(openFormBtn);

        expect(screen.getByTestId('qualification-stage-modal')).toBeInTheDocument();

        const titleInput = screen.getByTestId('stage-modal-title');
        const promptInput = screen.getByTestId('stage-modal-prompt');
        const criteriaInput = screen.getByTestId('stage-modal-criteria');

        fireEvent.change(titleInput, { target: { value: 'Orçamento' } });
        fireEvent.change(promptInput, { target: { value: 'Perguntar qual o valor disponível para investimento' } });
        fireEvent.change(criteriaInput, { target: { value: 'Valor numérico informado' } });

        const saveBtn = screen.getByTestId('stage-modal-save-btn');
        fireEvent.click(saveBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                title: 'Orçamento',
                prompt: 'Perguntar qual o valor disponível para investimento',
                criteria: 'Valor numérico informado'
            })
        ]));
    });

    it('deve abrir o modal para editar uma etapa existente', () => {
        render(<QualificationSection />);
        
        const stageCard = screen.getByText(/🎯 Experiência/i);
        fireEvent.click(stageCard);

        expect(screen.getByTestId('qualification-stage-modal')).toBeInTheDocument();

        const titleEditInput = screen.getByTestId('stage-modal-title');
        fireEvent.change(titleEditInput, { target: { value: 'Experiência Profissional' } });

        const saveEditBtn = screen.getByTestId('stage-modal-save-btn');
        fireEvent.click(saveEditBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                title: 'Experiência Profissional'
            })
        ]));
    });

    it('deve abrir o modal de confirmação de exclusão ao clicar no botão de lixeira', async () => {
        render(<QualificationSection />);
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(screen.getByText(/Você tem certeza que deseja apagar esta etapa de qualificação\?/i)).toBeInTheDocument();
        });
    });

    it('deve alternar entre as abas internas do funil e permitir alterar a ação final', () => {
        render(<QualificationSection />);

        // Valida que as 4 sub-abas internas estão presentes
        expect(screen.getByTestId('subtab-funnel-stages')).toBeInTheDocument();
        expect(screen.getByTestId('subtab-funnel-labels')).toBeInTheDocument();
        expect(screen.getByTestId('subtab-funnel-final-action')).toBeInTheDocument();
        expect(screen.getByTestId('subtab-funnel-scoring')).toBeInTheDocument();

        // Clica na aba de Ação Final
        fireEvent.click(screen.getByTestId('subtab-funnel-final-action'));
        expect(screen.getByText(/🎯 Pergunta \/ Ação Final Pós-Qualificação \(Fechamento\)/i)).toBeInTheDocument();
        
        const finalInput = screen.getByTestId('qualification-final-action-input');
        expect(finalInput).toBeInTheDocument();
        expect(finalInput.value).toBe('Pergunte se eu posso enviar o link do curso para ele.');

        fireEvent.change(finalInput, { target: { value: 'Pergunte se posso mandar o link de inscrição.' } });
        expect(mockSetQualificationFinalAction).toHaveBeenCalledWith('Pergunte se posso mandar o link de inscrição.');

        // Clica na aba de Etiquetas
        fireEvent.click(screen.getByTestId('subtab-funnel-labels'));
        expect(screen.getByText(/🏷️ Etiquetas do ZapVoice/i)).toBeInTheDocument();

        // Clica na aba de Lead Scoring
        fireEvent.click(screen.getByTestId('subtab-funnel-scoring'));
        expect(screen.getByText(/🔥 Diretrizes e Critérios do Lead Scoring/i)).toBeInTheDocument();
    });
});

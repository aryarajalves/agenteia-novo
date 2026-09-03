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

const mockConfigValues = {
    id: '1',
    isNew: false,
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

    it('deve renderizar a seção de funil de qualificação e as etapas existentes', () => {
        render(<QualificationSection />);
        expect(screen.getByText(/Funil de Qualificação & Sondagem Estratégica/i)).toBeInTheDocument();
        expect(screen.getByText(/🎯 Experiência/i)).toBeInTheDocument();
        expect(screen.getByText(/Descobrir se o lead já atua na área/i)).toBeInTheDocument();
        expect(screen.getByText(/🎯 Aparelho/i)).toBeInTheDocument();
    });

    it('deve abrir o formulário ao clicar em Nova Etapa / Prompt e cadastrar uma nova etapa', () => {
        render(<QualificationSection />);
        
        const openFormBtn = screen.getByText(/➕ Nova Etapa \/ Prompt/i);
        fireEvent.click(openFormBtn);

        expect(screen.getByText(/Cadastrar Etapa de Sondagem do Lead/i)).toBeInTheDocument();

        const titleInput = screen.getByPlaceholderText(/Ex: Experiência do Lead/i);
        const promptInput = screen.getByPlaceholderText(/Descubra se ela já atua com estética/i);
        const criteriaInput = screen.getByPlaceholderText(/Considerar concluído quando o lead/i);

        fireEvent.change(titleInput, { target: { value: 'Orçamento' } });
        fireEvent.change(promptInput, { target: { value: 'Perguntar qual o valor disponível para investimento' } });
        fireEvent.change(criteriaInput, { target: { value: 'Valor numérico informado' } });

        const saveBtn = screen.getByText(/Salvar Etapa no Funil/i);
        fireEvent.click(saveBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                title: 'Orçamento',
                prompt: 'Perguntar qual o valor disponível para investimento',
                criteria: 'Valor numérico informado'
            })
        ]));
    });

    it('deve permitir iniciar e salvar a edição inline de uma etapa', () => {
        render(<QualificationSection />);
        
        const stageCard = screen.getByText(/🎯 Experiência/i);
        fireEvent.click(stageCard);

        const titleEditInput = screen.getByPlaceholderText(/Nome da Etapa/i);
        fireEvent.change(titleEditInput, { target: { value: 'Experiência Profissional' } });

        const saveEditBtn = screen.getByTitle(/Salvar alteração/i);
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

    it('deve renderizar a seção de pergunta/ação final pós-qualificação e permitir alterar o valor', () => {
        render(<QualificationSection />);

        expect(screen.getByText(/🎯 Pergunta \/ Ação Final Pós-Qualificação \(Fechamento\)/i)).toBeInTheDocument();
        
        const finalInput = screen.getByTestId('qualification-final-action-input');
        expect(finalInput).toBeInTheDocument();
        expect(finalInput.value).toBe('Pergunte se eu posso enviar o link do curso para ele.');

        fireEvent.change(finalInput, { target: { value: 'Pergunte se posso mandar o link de inscrição.' } });
        expect(mockSetQualificationFinalAction).toHaveBeenCalledWith('Pergunte se posso mandar o link de inscrição.');
    });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import QualificationFunnelsBar from '../../components/ConfigPanel/components/QualificationFunnelsBar';

const mockSetQualificationFunnels = vi.fn();
const mockSetActiveFunnelId = vi.fn();
const mockSetQualificationQuestions = vi.fn();
const mockSetQualificationLabels = vi.fn();
const mockSetQualificationCriteria = vi.fn();
const mockSetQualificationFinalAction = vi.fn();
const mockSetQualificationFinalActionTrigger = vi.fn();

const initialFunnels = [
    {
        id: 'funnel_default',
        name: 'Padrão / Principal',
        is_default: true,
        questions: [{ title: 'Pergunta Padrão' }],
        labels: ['lead-qualificado'],
        criteria: 'Critério Padrão',
        final_action: 'Enviar link padrão',
        final_action_trigger: 'all'
    },
    {
        id: 'mentoria',
        name: 'Venda de Mentoria',
        is_default: false,
        questions: [{ title: 'Pergunta Mentoria' }],
        labels: ['mentoria-vip'],
        criteria: 'Critério Mentoria',
        final_action: 'Enviar link mentoria',
        final_action_trigger: 'hot'
    }
];

let mockConfigState = {};

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigState
}));

describe('QualificationFunnelsBar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfigState = {
            qualificationFunnels: initialFunnels,
            setQualificationFunnels: mockSetQualificationFunnels,
            activeFunnelId: 'funnel_default',
            setActiveFunnelId: mockSetActiveFunnelId,
            qualificationQuestions: [{ title: 'Pergunta Padrão' }],
            setQualificationQuestions: mockSetQualificationQuestions,
            qualificationLabels: ['lead-qualificado'],
            setQualificationLabels: mockSetQualificationLabels,
            qualificationCriteria: 'Critério Padrão',
            setQualificationCriteria: mockSetQualificationCriteria,
            qualificationFinalAction: 'Enviar link padrão',
            setQualificationFinalAction: mockSetQualificationFinalAction,
            qualificationFinalActionTrigger: 'all',
            setQualificationFinalActionTrigger: mockSetQualificationFinalActionTrigger
        };
    });

    it('deve renderizar o dropdown com os funis configurados e o selo de padrão', () => {
        render(<QualificationFunnelsBar />);

        expect(screen.getByText(/Funil de Qualificação Ativo/i)).toBeInTheDocument();
        expect(screen.getByTestId('funnels-select')).toBeInTheDocument();
        expect(screen.getByText(/Padrão \/ Principal \(Padrão\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Venda de Mentoria \[ID: mentoria\]/i)).toBeInTheDocument();
    });

    it('deve abrir o modal de criação ao clicar em Novo Funil', () => {
        render(<QualificationFunnelsBar />);

        const newFunnelBtn = screen.getByTestId('new-funnel-btn');
        fireEvent.click(newFunnelBtn);

        expect(screen.getByText(/Criar Novo Funil de Qualificação/i)).toBeInTheDocument();
        expect(screen.getByTestId('funnel-modal-name-input')).toBeInTheDocument();
    });

    it('deve criar um novo funil ao preencher e salvar o modal', () => {
        render(<QualificationFunnelsBar />);

        const newFunnelBtn = screen.getByTestId('new-funnel-btn');
        fireEvent.click(newFunnelBtn);

        const nameInput = screen.getByTestId('funnel-modal-name-input');
        fireEvent.change(nameInput, { target: { value: 'Imersão Presencial' } });

        const saveBtn = screen.getByTestId('funnel-modal-save-btn');
        fireEvent.click(saveBtn);

        expect(mockSetQualificationFunnels).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                id: 'imersao_presencial',
                name: 'Imersão Presencial'
            })
        ]));
        expect(mockSetActiveFunnelId).toHaveBeenCalledWith('imersao_presencial');
    });

    it('deve alternar para outro funil e carregar seus dados locais', () => {
        render(<QualificationFunnelsBar />);

        const select = screen.getByTestId('funnels-select');
        fireEvent.change(select, { target: { value: 'mentoria' } });

        expect(mockSetActiveFunnelId).toHaveBeenCalledWith('mentoria');
        expect(mockSetQualificationQuestions).toHaveBeenCalledWith([{ title: 'Pergunta Mentoria' }]);
        expect(mockSetQualificationLabels).toHaveBeenCalledWith(['mentoria-vip']);
        expect(mockSetQualificationFinalAction).toHaveBeenCalledWith('Enviar link mentoria');
        expect(mockSetQualificationFinalActionTrigger).toHaveBeenCalledWith('hot');
    });

    it('deve abrir o modal de renomear ao clicar no botão Renomear', () => {
        render(<QualificationFunnelsBar />);

        const renameBtn = screen.getByTestId('rename-funnel-btn');
        fireEvent.click(renameBtn);

        expect(screen.getByText(/Editar Nome do Funil/i)).toBeInTheDocument();
        const input = screen.getByTestId('funnel-modal-name-input');
        expect(input).toHaveValue('Padrão / Principal');
    });
});

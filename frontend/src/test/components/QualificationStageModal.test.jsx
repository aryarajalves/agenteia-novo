import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import QualificationStageModal from '../../components/ConfigPanel/components/Modals/QualificationStageModal';

describe('QualificationStageModal Component', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('não deve renderizar quando isOpen for false', () => {
        render(
            <QualificationStageModal
                isOpen={false}
                stage={null}
                onSave={vi.fn()}
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByTestId('qualification-stage-modal')).not.toBeInTheDocument();
    });

    it('deve renderizar campos de título, prompt e critério quando aberto para edição', () => {
        const mockStage = {
            title: 'Qual é o seu nome?',
            prompt: 'Descubra quanto o lead ganha para qualificação',
            criteria: 'Renda informada'
        };

        render(
            <QualificationStageModal
                isOpen={true}
                stage={mockStage}
                stageIndex={0}
                totalStages={2}
                onSave={vi.fn()}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByTestId('qualification-stage-modal')).toBeInTheDocument();
        expect(screen.getByText('Etapa 1: Qual é o seu nome?')).toBeInTheDocument();
        expect(screen.getByText('1 de 2')).toBeInTheDocument();

        expect(screen.getByTestId('stage-modal-title')).toHaveValue('Qual é o seu nome?');
        expect(screen.getByTestId('stage-modal-prompt')).toHaveValue('Descubra quanto o lead ganha para qualificação');
        expect(screen.getByTestId('stage-modal-criteria')).toHaveValue('Renda informada');
    });

    it('não deve fechar ao clicar no modal panel (stopPropagation)', () => {
        const onClose = vi.fn();
        render(
            <QualificationStageModal
                isOpen={true}
                stage={{ title: 'Teste', prompt: 'Prompt Teste' }}
                onSave={vi.fn()}
                onClose={onClose}
            />
        );

        const modalPanel = screen.getByTestId('qualification-stage-modal');
        fireEvent.click(modalPanel);

        expect(onClose).not.toHaveBeenCalled();
    });

    it('deve chamar onSave com os novos dados e fechar ao clicar em Salvar', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <QualificationStageModal
                isOpen={true}
                stage={{ title: 'Nome Inicial', prompt: 'Prompt Inicial', criteria: 'Critério Inicial' }}
                stageIndex={1}
                totalStages={3}
                onSave={onSave}
                onClose={onClose}
            />
        );

        fireEvent.change(screen.getByTestId('stage-modal-title'), { target: { value: 'Perfil Financeiro' } });
        fireEvent.change(screen.getByTestId('stage-modal-prompt'), { target: { value: 'Descubra a renda mensal estimada' } });
        fireEvent.change(screen.getByTestId('stage-modal-criteria'), { target: { value: 'Valor de renda declarado' } });

        fireEvent.click(screen.getByTestId('stage-modal-save-btn'));

        expect(onSave).toHaveBeenCalledWith({
            title: 'Perfil Financeiro',
            prompt: 'Descubra a renda mensal estimada',
            criteria: 'Valor de renda declarado',
            text: 'Perfil Financeiro',
            instruction: 'Descubra a renda mensal estimada'
        }, 1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('deve chamar onClose sem salvar ao clicar em Cancelar', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <QualificationStageModal
                isOpen={true}
                stage={{ title: 'Qual é o seu nome?', prompt: 'Prompt' }}
                stageIndex={0}
                onSave={onSave}
                onClose={onClose}
            />
        );

        fireEvent.click(screen.getByTestId('stage-modal-cancel-btn'));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSave).not.toHaveBeenCalled();
    });
});

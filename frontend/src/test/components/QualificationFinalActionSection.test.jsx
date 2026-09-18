import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import QualificationFinalActionSection from '../../components/ConfigPanel/components/QualificationFinalActionSection';

describe('QualificationFinalActionSection Component', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('deve renderizar o título, badge, textarea e botão de maximizar', () => {
        render(
            <QualificationFinalActionSection
                value="Pergunte se posso enviar o link"
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText(/Pergunta \/ Ação Final Pós-Qualificação/i)).toBeInTheDocument();
        expect(screen.getByText(/Fechamento do Funil/i)).toBeInTheDocument();
        expect(screen.getByTestId('maximize-qualification-final-action-btn')).toBeInTheDocument();
        expect(screen.getByTestId('qualification-final-action-input')).toHaveValue('Pergunte se posso enviar o link');
    });

    it('deve abrir o modal de maximizar ao clicar no botão ⛶ Maximizar', () => {
        render(
            <QualificationFinalActionSection
                value="Diretriz de fechamento inicial"
                onChange={vi.fn()}
            />
        );

        // Modal não deve estar aberto inicialmente
        expect(screen.queryByTestId('expanded-field-modal')).not.toBeInTheDocument();

        // Clica no botão maximizar
        const maxBtn = screen.getByTestId('maximize-qualification-final-action-btn');
        fireEvent.click(maxBtn);

        // Modal deve estar aberto
        expect(screen.getByTestId('expanded-field-modal')).toBeInTheDocument();
        expect(screen.getByTestId('expanded-field-textarea')).toHaveValue('Diretriz de fechamento inicial');
    });

    it('deve salvar as alterações ao editar no modal maximizado e clicar em Concluir Edição', () => {
        const onChange = vi.fn();
        render(
            <QualificationFinalActionSection
                value="Texto original"
                onChange={onChange}
            />
        );

        fireEvent.click(screen.getByTestId('maximize-qualification-final-action-btn'));

        const modalTextarea = screen.getByTestId('expanded-field-textarea');
        fireEvent.change(modalTextarea, { target: { value: 'Texto expandido atualizado' } });

        const saveBtn = screen.getByTestId('expanded-field-save-btn');
        fireEvent.click(saveBtn);

        expect(onChange).toHaveBeenCalledWith('Texto expandido atualizado');
        expect(screen.queryByTestId('expanded-field-modal')).not.toBeInTheDocument();
    });

    it('não deve salvar alterações ao clicar em Cancelar no modal maximizado', () => {
        const onChange = vi.fn();
        render(
            <QualificationFinalActionSection
                value="Texto original"
                onChange={onChange}
            />
        );

        fireEvent.click(screen.getByTestId('maximize-qualification-final-action-btn'));

        const modalTextarea = screen.getByTestId('expanded-field-textarea');
        fireEvent.change(modalTextarea, { target: { value: 'Texto alterado mas cancelado' } });

        const cancelBtn = screen.getByTestId('expanded-field-cancel-btn');
        fireEvent.click(cancelBtn);

        expect(onChange).not.toHaveBeenCalled();
        expect(screen.queryByTestId('expanded-field-modal')).not.toBeInTheDocument();
    });

    it('deve chamar onChange ao clicar em uma sugestão rápida', () => {
        const onChange = vi.fn();
        render(
            <QualificationFinalActionSection
                value=""
                onChange={onChange}
            />
        );

        const suggestionBtn = screen.getByText('Pergunte se eu posso enviar o link do curso para ele.');
        fireEvent.click(suggestionBtn);

        expect(onChange).toHaveBeenCalledWith('Pergunte se eu posso enviar o link do curso para ele.');
    });

    it('deve renderizar todas as opções de condição de envio e acionar onTriggerChange', () => {
        const onTriggerChange = vi.fn();
        render(
            <QualificationFinalActionSection
                value="Pergunte se posso enviar o link"
                onChange={vi.fn()}
                triggerValue="all"
                onTriggerChange={onTriggerChange}
            />
        );

        expect(screen.getByText(/Quando enviar a pergunta final\?/i)).toBeInTheDocument();
        expect(screen.getByTestId('trigger-opt-all')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-opt-hot')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-opt-hot_warm')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-opt-warm')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-opt-cold')).toBeInTheDocument();

        // Clica na opção "Apenas Quente"
        fireEvent.click(screen.getByTestId('trigger-opt-hot'));
        expect(onTriggerChange).toHaveBeenCalledWith('hot');

        // Clica na opção "Quente ou Morno"
        fireEvent.click(screen.getByTestId('trigger-opt-hot_warm'));
        expect(onTriggerChange).toHaveBeenCalledWith('hot_warm');
    });

    it('deve exibir a descrição dinâmica correspondente à condição selecionada', () => {
        const { rerender } = render(
            <QualificationFinalActionSection
                value="Texto"
                onChange={vi.fn()}
                triggerValue="hot"
                onTriggerChange={vi.fn()}
            />
        );

        expect(screen.getByText(/Envia somente se o lead for classificado como Quente/i)).toBeInTheDocument();

        rerender(
            <QualificationFinalActionSection
                value="Texto"
                onChange={vi.fn()}
                triggerValue="hot_warm"
                onTriggerChange={vi.fn()}
            />
        );

        expect(screen.getByText(/Envia se o lead for classificado como Quente 🔥 ou Morno ⚡/i)).toBeInTheDocument();
    });

    it('deve abrir o modal pelo botão do cabeçalho superior e fechar ao clicar no botão X', () => {
        render(
            <QualificationFinalActionSection
                value="Texto de teste"
                onChange={vi.fn()}
            />
        );

        const headerMaxBtn = screen.getByTestId('maximize-qualification-final-action-header-btn');
        fireEvent.click(headerMaxBtn);

        expect(screen.getByTestId('expanded-field-modal')).toBeInTheDocument();

        const closeBtn = screen.getByTestId('expanded-field-close-btn');
        fireEvent.click(closeBtn);

        expect(screen.queryByTestId('expanded-field-modal')).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import ExpandedFieldModal from '../../components/GlobalContextManager/components/ExpandedFieldModal';

describe('ExpandedFieldModal Component', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('não deve renderizar quando isOpen for false', () => {
        render(
            <ExpandedFieldModal
                isOpen={false}
                title="Título Teste"
                value="Texto de teste"
                onSave={vi.fn()}
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByTestId('expanded-field-modal')).not.toBeInTheDocument();
    });

    it('deve renderizar com título, subtítulo, ícone e valor inicial', () => {
        render(
            <ExpandedFieldModal
                isOpen={true}
                title="Prompt de Extração com IA"
                subtitle="Instruções para a IA"
                icon="🤖"
                value="Regra de extração número 1"
                placeholder="Digite algo..."
                onSave={vi.fn()}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByTestId('expanded-field-modal')).toBeInTheDocument();
        expect(screen.getByText('Prompt de Extração com IA')).toBeInTheDocument();
        expect(screen.getByText('Instruções para a IA')).toBeInTheDocument();
        expect(screen.getByText('🤖')).toBeInTheDocument();

        const textarea = screen.getByTestId('expanded-field-textarea');
        expect(textarea).toHaveValue('Regra de extração número 1');
    });

    it('não deve fechar ao clicar no overlay de fundo', () => {
        const onClose = vi.fn();
        render(
            <ExpandedFieldModal
                isOpen={true}
                title="Descrição"
                value="Texto de descrição"
                onSave={vi.fn()}
                onClose={onClose}
            />
        );

        const overlay = screen.getByTestId('expanded-field-overlay');
        fireEvent.click(overlay);

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('expanded-field-modal')).toBeInTheDocument();
    });

    it('deve chamar onSave com o texto editado e chamar onClose ao clicar em Concluir', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <ExpandedFieldModal
                isOpen={true}
                title="Prompt de Extração"
                value="Texto inicial"
                onSave={onSave}
                onClose={onClose}
            />
        );

        const textarea = screen.getByTestId('expanded-field-textarea');
        fireEvent.change(textarea, { target: { value: 'Texto alterado e melhorado' } });

        const saveBtn = screen.getByTestId('expanded-field-save-btn');
        fireEvent.click(saveBtn);

        expect(onSave).toHaveBeenCalledWith('Texto alterado e melhorado');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('deve fechar sem salvar ao clicar em Cancelar', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <ExpandedFieldModal
                isOpen={true}
                title="Descrição"
                value="Texto original"
                onSave={onSave}
                onClose={onClose}
            />
        );

        const textarea = screen.getByTestId('expanded-field-textarea');
        fireEvent.change(textarea, { target: { value: 'Alteração que deve ser cancelada' } });

        const cancelBtn = screen.getByTestId('expanded-field-cancel-btn');
        fireEvent.click(cancelBtn);

        expect(onSave).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

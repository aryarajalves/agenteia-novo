import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionFunnelModalHeader from '../../components/ConfigPanel/components/QuestionFunnels/components/QuestionFunnelModalHeader';
import QuestionFunnelModalFooter from '../../components/ConfigPanel/components/QuestionFunnels/components/QuestionFunnelModalFooter';
import QuestionFunnelBasicFields from '../../components/ConfigPanel/components/QuestionFunnels/components/QuestionFunnelBasicFields';
import QuestionFunnelSettingsFields from '../../components/ConfigPanel/components/QuestionFunnels/components/QuestionFunnelSettingsFields';
import QuestionFunnelStepsSection from '../../components/ConfigPanel/components/QuestionFunnels/components/QuestionFunnelStepsSection';
import { useQuestionFunnelForm } from '../../components/ConfigPanel/components/QuestionFunnels/hooks/useQuestionFunnelForm';

// Mock api client
vi.mock('../../../../api/client', () => ({
    api: {
        post: vi.fn()
    }
}));

describe('QuestionFunnel Subcomponents & Hooks Modulares', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('QuestionFunnelModalHeader', () => {
        it('deve renderizar título de criação e acionar onClose ao clicar no botão fechar', () => {
            const onClose = vi.fn();
            render(<QuestionFunnelModalHeader funnel={null} onClose={onClose} />);

            expect(screen.getByText('Novo Funil por Dúvida')).toBeInTheDocument();
            expect(screen.getByText(/Dispare áudio humanizado/i)).toBeInTheDocument();

            const closeBtn = screen.getByRole('button', { name: '✕' });
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('deve renderizar título de edição quando funnel é fornecido', () => {
            render(<QuestionFunnelModalHeader funnel={{ id: 1 }} onClose={vi.fn()} />);
            expect(screen.getByText('Editar Funil por Dúvida')).toBeInTheDocument();
        });
    });

    describe('QuestionFunnelModalFooter', () => {
        it('deve renderizar botões de cancelar e criar funil', () => {
            const onClose = vi.fn();
            const onSubmit = vi.fn();
            render(
                <QuestionFunnelModalFooter
                    loading={false}
                    funnel={null}
                    onClose={onClose}
                    onSubmit={onSubmit}
                />
            );

            expect(screen.getByText('Cancelar')).toBeInTheDocument();
            expect(screen.getByText('✨ Criar Funil')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Cancelar'));
            expect(onClose).toHaveBeenCalledTimes(1);

            fireEvent.click(screen.getByText('✨ Criar Funil'));
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });

        it('deve exibir estado de loading desabilitado', () => {
            render(
                <QuestionFunnelModalFooter
                    loading={true}
                    funnel={{ id: 1 }}
                    onClose={vi.fn()}
                    onSubmit={vi.fn()}
                />
            );

            expect(screen.getByText('⏳ Salvando...')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Salvando/i })).toBeDisabled();
        });
    });

    describe('QuestionFunnelBasicFields', () => {
        it('deve disparar onChange dos inputs e adicionar/remover variações', () => {
            const setName = vi.fn();
            const setTriggerQuestion = vi.fn();
            const setNewVariation = vi.fn();
            const onAddVariation = vi.fn();
            const onRemoveVariation = vi.fn();

            render(
                <QuestionFunnelBasicFields
                    name="Nome Teste"
                    setName={setName}
                    triggerQuestion="Pergunta Teste"
                    setTriggerQuestion={setTriggerQuestion}
                    variations={['variacao1', 'variacao2']}
                    newVariation="nova var"
                    setNewVariation={setNewVariation}
                    onAddVariation={onAddVariation}
                    onRemoveVariation={onRemoveVariation}
                />
            );

            const nameInput = screen.getByDisplayValue('Nome Teste');
            fireEvent.change(nameInput, { target: { value: 'Novo Nome' } });
            expect(setName).toHaveBeenCalledWith('Novo Nome');

            const addBtn = screen.getByRole('button', { name: /\+ Adicionar/i });
            fireEvent.click(addBtn);
            expect(onAddVariation).toHaveBeenCalledTimes(1);

            const removeButtons = screen.getAllByRole('button', { name: '✕' });
            fireEvent.click(removeButtons[0]);
            expect(onRemoveVariation).toHaveBeenCalledWith(0);
        });
    });

    describe('QuestionFunnelSettingsFields', () => {
        it('deve disparar mudanças de sensibilidade e modo de frequência', () => {
            const onSimilarityChange = vi.fn();
            const onFrequencyChange = vi.fn();

            render(
                <QuestionFunnelSettingsFields
                    similarityThreshold={0.85}
                    onSimilarityChange={onSimilarityChange}
                    frequencyMode="once_per_lead"
                    onFrequencyChange={onFrequencyChange}
                />
            );

            expect(screen.getByText('85%')).toBeInTheDocument();

            const alwaysRadio = screen.getByLabelText(/Sempre que o lead perguntar/i);
            fireEvent.click(alwaysRadio);
            expect(onFrequencyChange).toHaveBeenCalledWith('always');
        });
    });

    describe('useQuestionFunnelForm Hook', () => {
        it('deve inicializar com valores default e validar campos obrigatórios ao submeter', () => {
            const onSave = vi.fn();
            const { result } = renderHook(() => useQuestionFunnelForm({ funnel: null, isOpen: true, onSave }));

            expect(result.current.name).toBe('');
            expect(result.current.triggerQuestion).toBe('');
            expect(result.current.steps.length).toBe(2);

            act(() => {
                result.current.handleSubmit({ preventDefault: vi.fn() });
            });

            expect(result.current.formError).toContain('Informe um nome de identificação');
            expect(onSave).not.toHaveBeenCalled();

            act(() => {
                result.current.setName('Funil Valido');
                result.current.setTriggerQuestion('Pergunta Valida?');
            });

            act(() => {
                result.current.handleSubmit({ preventDefault: vi.fn() });
            });

            expect(result.current.formError).toBe('');
            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Funil Valido',
                trigger_question: 'Pergunta Valida?'
            }));
        });

        it('deve adicionar, atualizar, reordenar e remover passos', () => {
            const { result } = renderHook(() => useQuestionFunnelForm({ funnel: null, isOpen: true, onSave: vi.fn() }));

            // Adicionar novo passo de texto
            act(() => {
                result.current.handleAddStep('text');
            });
            expect(result.current.steps.length).toBe(3);
            expect(result.current.steps[2].type).toBe('text');

            // Atualizar passo
            act(() => {
                result.current.handleUpdateStep(2, 'content', 'Mensagem do passo 3');
            });
            expect(result.current.steps[2].content).toBe('Mensagem do passo 3');

            // Reordenar passo para cima
            act(() => {
                result.current.handleMoveStep(2, -1);
            });
            expect(result.current.steps[1].content).toBe('Mensagem do passo 3');

            // Remover passo
            act(() => {
                result.current.handleRemoveStep(1);
            });
            expect(result.current.steps.length).toBe(2);
        });
    });
});

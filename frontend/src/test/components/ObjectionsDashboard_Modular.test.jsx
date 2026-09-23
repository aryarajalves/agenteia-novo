import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import ObjectionCard from '../../components/ObjectionsDashboard/components/ObjectionCard';
import TrainRagModal from '../../components/ObjectionsDashboard/components/TrainRagModal';

describe('ObjectionsDashboard Modular Subcomponents', () => {
    describe('ObjectionCard', () => {
        const mockCluster = {
            id: 1,
            count: 10,
            category_name: 'Dúvidas de Preço',
            representative_question: 'Qual o valor do curso?',
            examples: ['Quanto custa?', 'Tem desconto no pix?'],
            suggested_script: 'O valor promocional é R$ 497 à vista.'
        };

        it('deve renderizar resumo do cluster corretamente quando colapsado', () => {
            render(
                <ObjectionCard
                    cluster={mockCluster}
                    index={0}
                    maxCount={10}
                    isExpanded={false}
                    onToggleExpand={() => {}}
                    onOpenRagModal={() => {}}
                />
            );

            expect(screen.getByText('1º')).toBeInTheDocument();
            expect(screen.getByText('10x')).toBeInTheDocument();
            expect(screen.getByText('Dúvidas de Preço')).toBeInTheDocument();
            expect(screen.getByText(/Qual o valor do curso\?/i)).toBeInTheDocument();
            expect(screen.queryByText(/Perguntas Reais dos Leads/i)).not.toBeInTheDocument();
        });

        it('deve renderizar detalhes expandidos quando isExpanded for true', () => {
            const onOpenRagMock = vi.fn();
            render(
                <ObjectionCard
                    cluster={mockCluster}
                    index={0}
                    maxCount={10}
                    isExpanded={true}
                    onToggleExpand={() => {}}
                    onOpenRagModal={onOpenRagMock}
                />
            );

            expect(screen.getByText(/Perguntas Reais dos Leads/i)).toBeInTheDocument();
            expect(screen.getByText('Quanto custa?')).toBeInTheDocument();
            expect(screen.getByText('Tem desconto no pix?')).toBeInTheDocument();
            expect(screen.getByText(/O valor promocional é R\$ 497 à vista\./i)).toBeInTheDocument();

            const ragBtn = screen.getByRole('button', { name: /Treinar Base de Conhecimento/i });
            fireEvent.click(ragBtn);
            expect(onOpenRagMock).toHaveBeenCalledWith(mockCluster);
        });
    });

    describe('TrainRagModal', () => {
        it('nao deve renderizar nada quando isOpen for false', () => {
            const { container } = render(
                <TrainRagModal
                    isOpen={false}
                    onClose={() => {}}
                    onSubmit={() => {}}
                    ragForm={{ kbId: '', question: '', answer: '' }}
                    setRagForm={() => {}}
                    knowledgeBases={[]}
                    savingRag={false}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('deve renderizar campos e permitir cancelar quando aberto', () => {
            const onCloseMock = vi.fn();
            render(
                <TrainRagModal
                    isOpen={true}
                    onClose={onCloseMock}
                    onSubmit={() => {}}
                    ragForm={{ kbId: '1', question: 'Dúvida X', answer: 'Resposta Y' }}
                    setRagForm={() => {}}
                    knowledgeBases={[{ id: 1, name: 'Base Principal' }]}
                    savingRag={false}
                />
            );

            expect(screen.getByText('Treinar Base de Conhecimento')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Dúvida X')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Resposta Y')).toBeInTheDocument();

            const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
            fireEvent.click(cancelBtn);
            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });
    });
});

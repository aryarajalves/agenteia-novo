import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LeadHistoryModalHeader from '../../components/WebhookManager/components/LeadHistoryModal/components/LeadHistoryModalHeader';
import LeadHistoryTable from '../../components/WebhookManager/components/LeadHistoryModal/components/LeadHistoryTable';
import LeadHistoryPagination from '../../components/WebhookManager/components/LeadHistoryModal/components/LeadHistoryPagination';
import LeadHistorySubmodals from '../../components/WebhookManager/components/LeadHistoryModal/components/LeadHistorySubmodals';

describe('LeadHistoryModal Modular Components', () => {
    describe('LeadHistoryModalHeader', () => {
        it('deve renderizar dados do lead e acionar recarregamento e fechamento', () => {
            const onReload = vi.fn();
            const onClose = vi.fn();

            render(
                <LeadHistoryModalHeader
                    lead={{ contato_nome: 'Fernanda Lima', telefone: '+5511987654321' }}
                    total={42}
                    loading={false}
                    onReload={onReload}
                    onClose={onClose}
                />
            );

            expect(screen.getByText('Histórico')).toBeInTheDocument();
            expect(screen.getByText('Fernanda Lima')).toBeInTheDocument();
            expect(screen.getByText(/42 disparos/)).toBeInTheDocument();

            const reloadBtn = screen.getByTitle('Atualizar Histórico');
            fireEvent.click(reloadBtn);
            expect(onReload).toHaveBeenCalled();

            const closeBtn = screen.getByText('✕');
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('LeadHistoryTable', () => {
        it('deve exibir mensagem de carregamento quando loading=true', () => {
            render(
                <LeadHistoryTable
                    events={[]}
                    loading={true}
                    getMessageTypeLabel={vi.fn()}
                    setMaximizedText={vi.fn()}
                    setSelectedPipelineEvent={vi.fn()}
                    handleDeleteEvent={vi.fn()}
                    handleRetryEvent={vi.fn()}
                    onSaveToCache={vi.fn()}
                    retryingEvents={new Set()}
                />
            );

            expect(screen.getByText('Buscando disparos...')).toBeInTheDocument();
        });

        it('deve exibir estado vazio quando não há disparos e loading=false', () => {
            render(
                <LeadHistoryTable
                    events={[]}
                    loading={false}
                    getMessageTypeLabel={vi.fn()}
                    setMaximizedText={vi.fn()}
                    setSelectedPipelineEvent={vi.fn()}
                    handleDeleteEvent={vi.fn()}
                    handleRetryEvent={vi.fn()}
                    onSaveToCache={vi.fn()}
                    retryingEvents={new Set()}
                />
            );

            expect(screen.getByText('Nenhum disparo encontrado.')).toBeInTheDocument();
        });
    });

    describe('LeadHistoryPagination', () => {
        it('deve renderizar controles de paginação e disparar callbacks de navegação', () => {
            const setLimit = vi.fn();
            const setPage = vi.fn();

            render(
                <LeadHistoryPagination
                    limit={20}
                    setLimit={setLimit}
                    page={2}
                    setPage={setPage}
                    eventsCount={20}
                    total={60}
                />
            );

            expect(screen.getByText(/Mostrando 20 de 60 eventos/)).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument(); // página atual
            expect(screen.getByText('3')).toBeInTheDocument(); // total de páginas (60/20)

            const prevBtn = screen.getByRole('button', { name: 'Anterior' });
            fireEvent.click(prevBtn);
            expect(setPage).toHaveBeenCalled();

            const nextBtn = screen.getByRole('button', { name: 'Próxima' });
            fireEvent.click(nextBtn);
            expect(setPage).toHaveBeenCalled();

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '50' } });
            expect(setLimit).toHaveBeenCalledWith(50);
        });

        it('deve desabilitar os botões de navegação nos limites de página', () => {
            const { rerender } = render(
                <LeadHistoryPagination
                    limit={10}
                    setLimit={vi.fn()}
                    page={1}
                    setPage={vi.fn()}
                    eventsCount={10}
                    total={10}
                />
            );

            expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
        });
    });

    describe('LeadHistorySubmodals', () => {
        it('deve renderizar modal de confirmação de deleção quando aberto', () => {
            render(
                <LeadHistorySubmodals
                    approveCacheModal={null}
                    setApproveCacheModal={vi.fn()}
                    handleConfirmSaveCache={vi.fn()}
                    handleLinkExistingCache={vi.fn()}
                    isSavingCache={false}
                    selectedPipelineEvent={null}
                    setSelectedPipelineEvent={vi.fn()}
                    events={[]}
                    webhook={{ id: 1 }}
                    confirmDelete={{ isOpen: true, eventId: 999 }}
                    setConfirmDelete={vi.fn()}
                    confirmDeleteEvent={vi.fn()}
                    confirmRetry={{ isOpen: false, eventId: null }}
                    setConfirmRetry={vi.fn()}
                    confirmRetryEvent={vi.fn()}
                    maximizedText={null}
                    setMaximizedText={vi.fn()}
                />
            );

            expect(screen.getByText('Excluir Mensagem')).toBeInTheDocument();
            expect(screen.getByText(/Tem certeza que deseja excluir permanentemente/i)).toBeInTheDocument();
        });

        it('deve renderizar modal de confirmação de retry quando aberto', () => {
            render(
                <LeadHistorySubmodals
                    approveCacheModal={null}
                    setApproveCacheModal={vi.fn()}
                    handleConfirmSaveCache={vi.fn()}
                    handleLinkExistingCache={vi.fn()}
                    isSavingCache={false}
                    selectedPipelineEvent={null}
                    setSelectedPipelineEvent={vi.fn()}
                    events={[]}
                    webhook={{ id: 1 }}
                    confirmDelete={{ isOpen: false, eventId: null }}
                    setConfirmDelete={vi.fn()}
                    confirmDeleteEvent={vi.fn()}
                    confirmRetry={{ isOpen: true, eventId: 777 }}
                    setConfirmRetry={vi.fn()}
                    confirmRetryEvent={vi.fn()}
                    maximizedText={null}
                    setMaximizedText={vi.fn()}
                />
            );

            expect(screen.getByText('Reiniciar Automação')).toBeInTheDocument();
            expect(screen.getByText(/Tem certeza que deseja reiniciar a automação/i)).toBeInTheDocument();
        });
    });
});

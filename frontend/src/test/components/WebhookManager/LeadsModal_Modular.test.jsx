import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import LeadsModalHeader from '../../../components/WebhookManager/components/LeadsModal/LeadsModalHeader';
import LeadsModalPagination from '../../../components/WebhookManager/components/LeadsModal/LeadsModalPagination';

describe('LeadsModal Modular Subcomponents', () => {
    describe('LeadsModalHeader', () => {
        it('deve renderizar contagem de contatos e badge de Tempo Real', () => {
            render(
                <LeadsModalHeader
                    total={42}
                    onSyncAll={() => {}}
                    isSyncing={false}
                    isImportRunning={false}
                    isStartingImport={false}
                    importProgress={{}}
                    onOpenImportProgress={() => {}}
                    setShowConfirmImport={() => {}}
                    onClose={() => {}}
                />
            );

            expect(screen.getByText('Contatos Capturados')).toBeInTheDocument();
            expect(screen.getByText('42 contatos identificados')).toBeInTheDocument();
            expect(screen.getByText('Tempo Real')).toBeInTheDocument();
        });

        it('deve acionar onSyncAll e onClose nos cliques de botão', () => {
            const onSyncMock = vi.fn();
            const onCloseMock = vi.fn();

            render(
                <LeadsModalHeader
                    total={10}
                    onSyncAll={onSyncMock}
                    isSyncing={false}
                    isImportRunning={false}
                    isStartingImport={false}
                    importProgress={{}}
                    onOpenImportProgress={() => {}}
                    setShowConfirmImport={() => {}}
                    onClose={onCloseMock}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Sincronizar Tudo/i }));
            expect(onSyncMock).toHaveBeenCalledTimes(1);

            fireEvent.click(screen.getByRole('button', { name: '✕' }));
            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('LeadsModalPagination', () => {
        it('deve renderizar informacoes de pagina e responder ao clique de paginacao', () => {
            const onPageChangeMock = vi.fn();
            const onFilterChangeMock = vi.fn();

            render(
                <LeadsModalPagination
                    pageSize={20}
                    page={1}
                    total={60}
                    loading={false}
                    onFilterChange={onFilterChangeMock}
                    onPageChange={onPageChangeMock}
                />
            );

            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();

            const nextBtn = screen.getByRole('button', { name: 'Próxima →' });
            fireEvent.click(nextBtn);
            expect(onPageChangeMock).toHaveBeenCalledWith(2);

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '50' } });
            expect(onFilterChangeMock).toHaveBeenCalledWith({ pageSize: 50 });
        });
    });
});

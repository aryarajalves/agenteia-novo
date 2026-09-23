import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SemanticCacheNavTabs from '../../components/ConfigPanel/components/SemanticCache/SemanticCacheNavTabs';
import SemanticCacheModals from '../../components/ConfigPanel/components/SemanticCache/SemanticCacheModals';

describe('TabSemanticCache Modular Subcomponents', () => {
    describe('SemanticCacheNavTabs', () => {
        it('deve renderizar as 3 abas de navegação e alternar subaba ao clicar', () => {
            const setActiveSubTab = vi.fn();

            render(
                <SemanticCacheNavTabs
                    activeSubTab="responses"
                    setActiveSubTab={setActiveSubTab}
                    totalCount={25}
                    semanticCacheEnabled={true}
                />
            );

            expect(screen.getByText('📋 Respostas no Cache')).toBeInTheDocument();
            expect(screen.getByText('25')).toBeInTheDocument();
            expect(screen.getByText('📥 Dúvidas dos Leads')).toBeInTheDocument();
            expect(screen.getByText('⚙️ Configurações & Limiares')).toBeInTheDocument();
            expect(screen.getByText('Ativo')).toBeInTheDocument();

            const doubtsTab = screen.getByTestId('subtab-lead-questions');
            fireEvent.click(doubtsTab);
            expect(setActiveSubTab).toHaveBeenCalledWith('lead_questions');

            const settingsTab = screen.getByTestId('subtab-cache-settings');
            fireEvent.click(settingsTab);
            expect(setActiveSubTab).toHaveBeenCalledWith('settings');
        });

        it('deve exibir badge Pausado quando semanticCacheEnabled for false', () => {
            render(
                <SemanticCacheNavTabs
                    activeSubTab="settings"
                    setActiveSubTab={vi.fn()}
                    totalCount={10}
                    semanticCacheEnabled={false}
                />
            );

            expect(screen.getByText('Pausado')).toBeInTheDocument();
        });
    });

    describe('SemanticCacheModals', () => {
        it('deve renderizar o modal de deleção quando isOpen for true', () => {
            const onConfirmDelete = vi.fn();
            const onCloseDeleteModal = vi.fn();

            render(
                <SemanticCacheModals
                    createModal={false}
                    createModalInitialData={null}
                    agentId={1}
                    cacheItems={[]}
                    onCloseCreateModal={vi.fn()}
                    onSaveCreate={vi.fn()}
                    onLinkVariation={vi.fn()}
                    actionLoading={false}
                    semanticCacheThreshold={0.8}
                    editModal={{ isOpen: false, item: null }}
                    onCloseEditModal={vi.fn()}
                    onSaveEdit={vi.fn()}
                    deleteModal={{ isOpen: true, item: { id: 10, user_query: 'Quanto custa o serviço?' } }}
                    onCloseDeleteModal={onCloseDeleteModal}
                    onConfirmDelete={onConfirmDelete}
                />
            );

            expect(screen.getByText(/Excluir Resposta do Cache/i)).toBeInTheDocument();
            expect(screen.getByText(/Quanto custa o serviço\?/i)).toBeInTheDocument();

            const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
            fireEvent.click(cancelBtn);
            expect(onCloseDeleteModal).toHaveBeenCalled();
        });
    });
});

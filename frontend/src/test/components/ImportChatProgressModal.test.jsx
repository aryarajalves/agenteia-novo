import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportChatProgressModal from '../../components/WebhookManager/components/ImportChatProgressModal';
import LeadsModal from '../../components/WebhookManager/components/LeadsModal';

// Mock de subcomponentes para isolar os testes
vi.mock('../../components/WebhookManager/components/AutomationPipelineModal', () => ({ default: () => null }));
vi.mock('../../components/WebhookManager/components/FollowupPipelineModal', () => ({ default: () => null }));
vi.mock('../../components/WebhookManager/components/LeadVariablesModal', () => ({ default: () => null }));
vi.mock('../../components/WebhookManager/utils/helpers', () => ({
    formatDate: (d) => d || '',
    showToast: vi.fn()
}));

describe('ImportChatProgressModal Component', () => {
    it('não renderiza nada quando isOpen é false', () => {
        const { container } = render(
            <ImportChatProgressModal
                isOpen={false}
                onClose={vi.fn()}
                progress={{}}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza título, progresso, contadores e status quando aberto', () => {
        const progress = {
            current: 15,
            total: 30,
            percentage: 50,
            status: 'Importando conversa 15 de 30 - Maria...',
            createdLeads: 8,
            importedMessages: 42,
            done: false,
            error: null
        };

        render(
            <ImportChatProgressModal
                isOpen={true}
                onClose={vi.fn()}
                progress={progress}
            />
        );

        expect(screen.getByText('Importando do ZapJords')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('Conversa 15 de 30')).toBeInTheDocument();
        expect(screen.getByText('Importando conversa 15 de 30 - Maria...')).toBeInTheDocument();
        expect(screen.getByText('+8')).toBeInTheDocument();
        expect(screen.getByText('+42')).toBeInTheDocument();
        expect(screen.getByText('Ocultar em Segundo Plano')).toBeInTheDocument();
    });

    it('renderiza estado concluído com botão Concluir e aciona onClose', () => {
        const onCloseMock = vi.fn();
        const progress = {
            current: 30,
            total: 30,
            percentage: 100,
            status: 'Importação concluída com sucesso!',
            createdLeads: 12,
            importedMessages: 85,
            done: true,
            error: null
        };

        render(
            <ImportChatProgressModal
                isOpen={true}
                onClose={onCloseMock}
                progress={progress}
            />
        );

        expect(screen.getByText('Importação Concluída!')).toBeInTheDocument();
        const btn = screen.getByText('✅ Concluir');
        fireEvent.click(btn);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('renderiza estado de erro com botão Fechar e mensagem de falha em destaque', () => {
        const onCloseMock = vi.fn();
        const progress = {
            current: 5,
            total: 30,
            percentage: 16,
            status: 'Erro: conexão perdida',
            createdLeads: 2,
            importedMessages: 10,
            done: false,
            error: 'Falha crítica no banco de dados'
        };

        render(
            <ImportChatProgressModal
                isOpen={true}
                onClose={onCloseMock}
                progress={progress}
            />
        );

        expect(screen.getByText('Erro na Importação')).toBeInTheDocument();
        expect(screen.getByText('Ocorreu uma falha durante o processo')).toBeInTheDocument();
        expect(screen.getByText('Falha crítica no banco de dados')).toBeInTheDocument();
        expect(screen.queryByText('✅ Concluir')).toBeNull();

        const btnFechar = screen.getByText('Fechar');
        expect(btnFechar).toBeInTheDocument();
        fireEvent.click(btnFechar);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('exibe o botão "🛑 Cancelar Importação" e abre o modal de confirmação', () => {
        const onCancelMock = vi.fn();
        const progress = {
            current: 10,
            total: 100,
            percentage: 10,
            status: 'Importando conversa 10 de 100...',
            createdLeads: 5,
            importedMessages: 25,
            done: false,
            error: null
        };

        render(
            <ImportChatProgressModal
                isOpen={true}
                onClose={vi.fn()}
                onCancel={onCancelMock}
                progress={progress}
            />
        );

        // Verifica presença do botão de cancelar
        const cancelBtn = screen.getByText('🛑 Cancelar Importação');
        expect(cancelBtn).toBeInTheDocument();

        // 1. Clicar em cancelar abre popup de confirmação
        fireEvent.click(cancelBtn);
        expect(screen.getByText('Cancelar Importação?')).toBeInTheDocument();
        expect(screen.getByText('Voltar')).toBeInTheDocument();
        expect(screen.getByText('Sim, Cancelar')).toBeInTheDocument();

        // 2. Clicar em Voltar fecha popup sem acionar onCancel
        fireEvent.click(screen.getByText('Voltar'));
        expect(onCancelMock).not.toHaveBeenCalled();
        expect(screen.queryByText('Cancelar Importação?')).toBeNull();

        // 3. Abrir de novo e confirmar aciona onCancel
        fireEvent.click(cancelBtn);
        fireEvent.click(screen.getByText('Sim, Cancelar'));
        expect(onCancelMock).toHaveBeenCalledTimes(1);
    });

    it('renderiza o contador de tempo decorrido e tempo total formatado (MM:SS)', () => {
        const progressRunning = {
            current: 10,
            total: 20,
            percentage: 50,
            status: 'Importando...',
            createdLeads: 5,
            importedMessages: 20,
            elapsedSeconds: 65,
            done: false,
            error: null
        };

        const { rerender } = render(
            <ImportChatProgressModal
                isOpen={true}
                onClose={vi.fn()}
                progress={progressRunning}
            />
        );

        expect(screen.getByText(/Tempo Decorrido/i)).toBeInTheDocument();
        expect(screen.getByText(/01:05/)).toBeInTheDocument();

        // Agora testa quando concluído (Tempo Total)
        const progressDone = {
            ...progressRunning,
            done: true,
            elapsedSeconds: 150
        };

        rerender(
            <ImportChatProgressModal
                isOpen={true}
                onClose={vi.fn()}
                progress={progressDone}
            />
        );

        expect(screen.getByText(/Tempo Total/i)).toBeInTheDocument();
        expect(screen.getByText(/02:30/)).toBeInTheDocument();
    });
});

describe('LeadsModal - Botão Importar do ZapJords e Popup de Confirmação', () => {
    const defaultLeadsModal = {
        webhook: { id: 1, name: 'WhatsApp Oficial' },
        leads: [],
        total: 0,
        loading: false,
        page: 1,
        pageSize: 20,
        search: '',
        podeEnviar: 'all',
        dateStart: '',
        dateEnd: '',
        janelaAberta: 'all',
        semMensagens: 'all'
    };

    it('exibe o botão "📥 Importar do ZapJords" e abre o popup de confirmação antes de importar', () => {
        const onImportChat = vi.fn();
        const onSyncAll = vi.fn();

        render(
            <LeadsModal
                leadsModal={defaultLeadsModal}
                onClose={vi.fn()}
                onSearch={vi.fn()}
                onFilterChange={vi.fn()}
                onPageChange={vi.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={vi.fn()}
                toggleSelectAllLeads={vi.fn()}
                onBulkDelete={vi.fn()}
                onDeleteLead={vi.fn()}
                onSyncAll={onSyncAll}
                onImportChat={onImportChat}
                isSyncing={false}
                isStartingImport={false}
                onViewHistory={vi.fn()}
            />
        );

        expect(screen.getByText('🔄 Sincronizar Tudo')).toBeInTheDocument();
        const importBtn = screen.getByText('📥 Importar do ZapJords');
        expect(importBtn).toBeInTheDocument();

        // 1. Clicar no botão de importar deve abrir o popup de confirmação sem chamar onImportChat ainda
        fireEvent.click(importBtn);
        expect(onImportChat).not.toHaveBeenCalled();

        // Modal de confirmação visível com mensagem e botões
        expect(screen.getByText('Deseja sincronizar todas as conversas do ZapJords? Os contatos serão criados e suas mensagens salvas na memória sem custo de IA. O follow-up de novos contatos será pausado automaticamente.')).toBeInTheDocument();
        expect(screen.getByText('Sim, Importar')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeInTheDocument();

        // 2. Clicar em "Cancelar" fecha o popup sem importar
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onImportChat).not.toHaveBeenCalled();
        expect(screen.queryByText('Sim, Importar')).toBeNull();

        // 3. Abrir de novo e confirmar aciona onImportChat
        fireEvent.click(importBtn);
        const confirmBtn = screen.getByText('Sim, Importar');
        fireEvent.click(confirmBtn);
        expect(onImportChat).toHaveBeenCalledTimes(1);
    });

    it('exibe estado de loading "Importando..." quando a importação está iniciando', () => {
        render(
            <LeadsModal
                leadsModal={defaultLeadsModal}
                onClose={vi.fn()}
                onSearch={vi.fn()}
                onFilterChange={vi.fn()}
                onPageChange={vi.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={vi.fn()}
                toggleSelectAllLeads={vi.fn()}
                onBulkDelete={vi.fn()}
                onDeleteLead={vi.fn()}
                onSyncAll={vi.fn()}
                onImportChat={vi.fn()}
                isSyncing={false}
                isStartingImport={true}
                onViewHistory={vi.fn()}
            />
        );

        expect(screen.getByText('Importando...')).toBeInTheDocument();
    });

    it('exibe banner e botão de reabertura "Ver Progresso" quando a importação está rodando em segundo plano', () => {
        const onOpenImportProgressMock = vi.fn();
        const activeProgress = {
            isOpen: false,
            current: 45,
            total: 100,
            percentage: 45,
            status: 'Importando conversa 45 de 100...',
            createdLeads: 20,
            importedMessages: 150,
            elapsedSeconds: 75,
            done: false,
            error: null
        };

        render(
            <LeadsModal
                leadsModal={defaultLeadsModal}
                onClose={vi.fn()}
                onSearch={vi.fn()}
                onFilterChange={vi.fn()}
                onPageChange={vi.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={vi.fn()}
                toggleSelectAllLeads={vi.fn()}
                onBulkDelete={vi.fn()}
                onDeleteLead={vi.fn()}
                onSyncAll={vi.fn()}
                onImportChat={vi.fn()}
                importProgress={activeProgress}
                onOpenImportProgress={onOpenImportProgressMock}
                isSyncing={false}
                isStartingImport={false}
                onViewHistory={vi.fn()}
            />
        );

        // 1. Verifica banner em segundo plano com contador de tempo
        expect(screen.getByText(/Importação do ZapJords em andamento: 45%/)).toBeInTheDocument();
        expect(screen.getByText(/01:15/)).toBeInTheDocument();
        const verProgressoBannerBtn = screen.getByText('👁️ Ver Progresso');
        expect(verProgressoBannerBtn).toBeInTheDocument();

        // 2. Verifica botão dinâmico no cabeçalho
        const verProgressoHeaderBtn = screen.getByText(/⚡ Importando \(45%\) - Ver Progresso/);
        expect(verProgressoHeaderBtn).toBeInTheDocument();

        // 3. Clicar em qualquer um dos botões aciona onOpenImportProgress
        fireEvent.click(verProgressoBannerBtn);
        expect(onOpenImportProgressMock).toHaveBeenCalledTimes(1);

        fireEvent.click(verProgressoHeaderBtn);
        expect(onOpenImportProgressMock).toHaveBeenCalledTimes(2);
    });
});

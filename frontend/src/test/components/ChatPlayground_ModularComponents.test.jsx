import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vk } from 'vitest';
import Header from '../../components/ChatPlayground/components/Header';
import PlaygroundLoadingOverlay from '../../components/ChatPlayground/components/PlaygroundLoadingOverlay';
import PlaygroundModals from '../../components/ChatPlayground/components/PlaygroundModals';

describe('ChatPlayground Modular Components', () => {
    describe('Header Component', () => {
        const defaultProps = {
            isSidebarOpen: true,
            setIsSidebarOpen: vi.fn(),
            agents: [{ id: 1, name: 'Agente Suporte' }],
            selectedAgentId: 1,
            isBattleMode: false,
            battleTab: 'chat',
            setBattleTab: vi.fn(),
            challengerHotfixPrompt: '',
            setShowResetChatConfirm: vi.fn(),
            handleExportTraining: vi.fn(),
            setIsNavigating: vi.fn()
        };

        it('deve renderizar o nome do agente e botões principais de ação', () => {
            render(<Header {...defaultProps} />);
            expect(screen.getByText('Agente Suporte')).toBeInTheDocument();
            expect(screen.getByTestId('reset-chat-header-btn')).toBeInTheDocument();
            expect(screen.getByTestId('export-training-btn')).toBeInTheDocument();
            expect(screen.getByTestId('edit-prompt-header-btn')).toBeInTheDocument();
        });

        it('deve chamar setIsSidebarOpen ao clicar no botão de toggle da sidebar', () => {
            render(<Header {...defaultProps} />);
            const toggleBtn = screen.getByTitle('Ocultar Painel Lateral');
            fireEvent.click(toggleBtn);
            expect(defaultProps.setIsSidebarOpen).toHaveBeenCalledWith(false);
        });

        it('deve abrir o modal de reset ao clicar em Resetar', () => {
            render(<Header {...defaultProps} />);
            fireEvent.click(screen.getByTestId('reset-chat-header-btn'));
            expect(defaultProps.setShowResetChatConfirm).toHaveBeenCalledWith(true);
        });

        it('deve chamar handleExportTraining ao clicar em Exportar', () => {
            render(<Header {...defaultProps} />);
            fireEvent.click(screen.getByTestId('export-training-btn'));
            expect(defaultProps.handleExportTraining).toHaveBeenCalled();
        });

        it('deve renderizar abas da arena quando em battleMode', () => {
            render(<Header {...defaultProps} isBattleMode={true} challengerHotfixPrompt="Teste" />);
            expect(screen.getByTestId('arena-tab-chat')).toBeInTheDocument();
            expect(screen.getByTestId('arena-tab-prompt')).toBeInTheDocument();
        });
    });

    describe('PlaygroundLoadingOverlay Component', () => {
        it('deve exibir mensagem padrão de carregamento', () => {
            render(<PlaygroundLoadingOverlay isNavigating={false} />);
            expect(screen.getByText('Preparando ambiente de teste...')).toBeInTheDocument();
        });

        it('deve exibir mensagem de navegação quando isNavigating for true', () => {
            render(<PlaygroundLoadingOverlay isNavigating={true} />);
            expect(screen.getByText('Abrindo configurações do agente...')).toBeInTheDocument();
        });
    });

    describe('PlaygroundModals Component', () => {
        it('deve renderizar o modal de confirmação de reset quando showResetChatConfirm for true', () => {
            render(
                <PlaygroundModals
                    analysisData={{ show: false, content: '', type: '' }}
                    setAnalysisData={vi.fn()}
                    correctionModal={{ show: false }}
                    setCorrectionModal={vi.fn()}
                    saveCorrection={vi.fn()}
                    cacheConfirmModal={{ show: false }}
                    selectedAgentId={1}
                    confirmSaveToCache={vi.fn()}
                    linkToExistingCache={vi.fn()}
                    cancelSaveToCache={vi.fn()}
                    savingFeedback={false}
                    testerReport={null}
                    setTesterReport={vi.fn()}
                    showGuide={false}
                    setShowGuide={vi.fn()}
                    showResetChatConfirm={true}
                    setShowResetChatConfirm={vi.fn()}
                    handleConfirmResetChat={vi.fn()}
                    showDeleteConfirm={false}
                    setShowDeleteConfirm={vi.fn()}
                    selectedSessions={new Set()}
                    executeDelete={vi.fn()}
                />
            );
            expect(screen.getByText('Resetar Conversa')).toBeInTheDocument();
        });
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../../components/ChatPlayground/components/Sidebar';

const mockProps = {
    activeTab: 'test',
    setActiveTab: vi.fn(),
    setShowGuide: vi.fn(),
    agents: [{ id: '1', name: 'Agent 1', model: 'gpt-4' }],
    selectedAgentId: '1',
    isBattleMode: false,
    setIsBattleMode: vi.fn(),
    isTesterMode: false,
    setIsTesterMode: vi.fn(),
    testerSentiment: 50,
    testerPersona: 'default',
    setTesterPersona: vi.fn(),
    customPersona: '',
    setCustomPersona: vi.fn(),
    testerMessageCount: 5,
    setTesterMessageCount: vi.fn(),
    testerDelay: 2,
    setTesterDelay: vi.fn(),
    testerKnowsPrompt: false,
    setTesterKnowsPrompt: vi.fn(),
    testerIsDynamic: false,
    setTesterIsDynamic: vi.fn(),
    isTesterAutoRunning: false,
    isTesterRunning: false,
    toggleAutoTester: vi.fn(),
    loading: false,
    mainModelOverride: '',
    setMainModelOverride: vi.fn(),
    availableModels: ['gpt-4', 'gpt-3.5-turbo'],
    challengerModelOverride: '',
    setChallengerModelOverride: vi.fn(),
    challengerAgentId: null,
    globalVars: [],
    contextVars: {},
    setContextVars: vi.fn(),
    sessionId: 'session-123',
    showToast: vi.fn(),
    sessionStats: { responseCount: 0, totalTokens: 0, totalCost: 0 },
    handleReset: vi.fn(),
    sessions: [],
    historyFilter: 'all',
    setHistoryFilter: vi.fn(),
    isSelectionMode: false,
    toggleSelectionMode: vi.fn(),
    selectedSessions: new Set(),
    toggleSelectAll: vi.fn(),
    setShowDeleteConfirm: vi.fn(),
    extractBatchQuestions: vi.fn(),
    toggleSessionSelection: vi.fn(),
    loadSession: vi.fn()
};

describe('Sidebar Component', () => {
    it('deve renderizar as abas de Testar e History', () => {
        render(<Sidebar {...mockProps} />);
        expect(screen.getByText('🧪 Testar')).toBeInTheDocument();
        expect(screen.getByText('📜 History')).toBeInTheDocument();
    });

    it('deve trocar de aba ao clicar', () => {
        render(<Sidebar {...mockProps} />);
        fireEvent.click(screen.getByText('📜 History'));
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('history');
    });

    it('deve exibir o título do Laboratório', () => {
        render(<Sidebar {...mockProps} />);
        expect(screen.getByText('🧪 Laboratório')).toBeInTheDocument();
    });

    it('deve alternar o modo Arena A/B', () => {
        render(<Sidebar {...mockProps} />);
        // Procura pelo checkbox dentro do container da Arena
        const arenaToggle = screen.getByLabelText('Arena A/B Testing');
        fireEvent.click(arenaToggle);
        expect(mockProps.setIsBattleMode).toHaveBeenCalled();
    });

    it('deve abrir o guia ao clicar no botão de Guia', () => {
        render(<Sidebar {...mockProps} />);
        fireEvent.click(screen.getByText('Guia'));
        expect(mockProps.setShowGuide).toHaveBeenCalledWith(true);
    });

    it('deve renderizar os modelos disponíveis no select de modelo principal', () => {
        const customProps = {
            ...mockProps,
            availableModels: ['gpt-5', 'gpt-5-mini', 'gpt-5.2', 'gpt-4o', 'gpt-4o-mini', 'o3-mini']
        };
        render(<Sidebar {...customProps} />);
        expect(screen.getByText('gpt-5')).toBeInTheDocument();
        expect(screen.getByText('gpt-5-mini')).toBeInTheDocument();
        expect(screen.getByText('gpt-5.2')).toBeInTheDocument();
        expect(screen.getByText('o3-mini')).toBeInTheDocument();
    });
});

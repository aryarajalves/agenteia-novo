import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageList from '../../../components/ChatPlayground/components/MessageList';

const mockMessages = [
    { role: 'user', content: 'Olá', timestamp: new Date().toISOString() },
    { role: 'assistant', content: 'Olá, como posso ajudar?', tokens: { total: 10 }, cost: 0.01, timestamp: new Date().toISOString() }
];

const mockProps = {
    isBattleMode: false,
    messages: mockMessages,
    battleMessages: [],
    loading: false,
    agents: [{ id: '1', name: 'Agent 1', model: 'gpt-4' }],
    selectedAgentId: '1',
    challengerAgentId: null,
    mainModelOverride: '',
    challengerModelOverride: '',
    handleFeedback: vi.fn(),
    scrollRef: { current: null },
    battleScrollRef: { current: null }
};

describe('MessageList Component', () => {
    it('deve renderizar as mensagens do chat principal', () => {
        render(<MessageList {...mockProps} />);
        expect(screen.getByText('Olá')).toBeInTheDocument();
        expect(screen.getByText('Olá, como posso ajudar?')).toBeInTheDocument();
    });

    it('deve exibir o indicador de carregamento quando loading=true', () => {
        render(<MessageList {...mockProps} loading={true} />);
        const dots = document.querySelector('.typing-indicator');
        expect(dots).toBeInTheDocument();
    });

    it('deve renderizar duas colunas no modo Battle', () => {
        const battleProps = {
            ...mockProps,
            isBattleMode: true,
            battleMessages: [{ role: 'assistant', content: 'Resposta Desafiante', timestamp: new Date().toISOString() }],
            challengerAgentId: '2',
            agents: [...mockProps.agents, { id: '2', name: 'Challenger', model: 'gpt-3.5' }]
        };
        render(<MessageList {...battleProps} />);
        expect(screen.getByText('Resposta Desafiante')).toBeInTheDocument();
        expect(screen.getByText('🥊 Challenger')).toBeInTheDocument();
    });

    it('deve fechar outros Raio-X quando um Raio-X for aberto (comportamento de acordeão)', () => {
        const debugMessages = [
            {
                role: 'assistant',
                content: 'Primeira resposta IA',
                metrics: { tokens: 15, cost: 0.001 },
                debug: { system_prompt: 'prompt 1', intent: 'duvida' }
            },
            {
                role: 'assistant',
                content: 'Segunda resposta IA',
                metrics: { tokens: 20, cost: 0.002 },
                debug: { system_prompt: 'prompt 2', intent: 'venda' }
            }
        ];

        render(<MessageList {...mockProps} messages={debugMessages} />);

        // Devem existir 2 botões de Raio-X
        const raioXButtons = screen.getAllByTestId('raio-x-toggle-btn');
        expect(raioXButtons).toHaveLength(2);
        expect(raioXButtons[0]).toHaveTextContent('🔍 Raio-X');
        expect(raioXButtons[1]).toHaveTextContent('🔍 Raio-X');

        // Abre o primeiro Raio-X
        fireEvent.click(raioXButtons[0]);
        expect(raioXButtons[0]).toHaveTextContent('Ocultar Detalhes');
        expect(raioXButtons[1]).toHaveTextContent('🔍 Raio-X');

        // Abre o segundo Raio-X -> o primeiro deve fechar automaticamente!
        fireEvent.click(raioXButtons[1]);
        expect(raioXButtons[0]).toHaveTextContent('🔍 Raio-X');
        expect(raioXButtons[1]).toHaveTextContent('Ocultar Detalhes');

        // Clica novamente no segundo Raio-X -> deve fechar
        fireEvent.click(raioXButtons[1]);
        expect(raioXButtons[0]).toHaveTextContent('🔍 Raio-X');
        expect(raioXButtons[1]).toHaveTextContent('🔍 Raio-X');
    });
});


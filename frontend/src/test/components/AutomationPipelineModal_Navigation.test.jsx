import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AutomationPipelineModal from '../../components/WebhookManager/components/AutomationPipelineModal';
import PipelineHeader from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineHeader';
import { isUserMessage } from '../../components/WebhookManager/components/AutomationPipelineModal/hooks/useUserMessagesNavigation';

// Mock usePipelineEvent hook
vi.mock('../../components/WebhookManager/components/AutomationPipelineModal/hooks/usePipelineEvent', () => ({
    usePipelineEvent: (initialEvent) => ({
        event: {
            ...initialEvent,
            created_at: initialEvent?.created_at || '2026-09-07T16:42:05.000Z',
            status: 'completed',
            processing_steps: JSON.stringify([
                {
                    step: '🧠 Pre-Router',
                    detail: 'Análise de intenção concluída.',
                    timestamp: '2026-09-07T16:42:06.000Z'
                }
            ])
        },
        loading: false,
        initialLoading: false,
        isTimeout: false,
        pollEvent: vi.fn(),
        handleManualRefresh: vi.fn()
    })
}));

describe('AutomationPipelineModal - Navegação entre Mensagens e Indicador de Última Mensagem', () => {
    const mockEvents = [
        {
            id: 101,
            contato_nome: 'Aryaraj Fernandes',
            telefone: '5585998259497',
            mensagem: 'Oie',
            dono: 'usuario',
            event_type: 'message',
            created_at: '2026-09-07T16:42:05.000Z',
            status: 'completed'
        },
        {
            id: 102,
            contato_nome: 'Aryaraj Fernandes',
            telefone: '5585998259497',
            mensagem: 'Quem é tarcira?',
            dono: 'usuario',
            event_type: 'message',
            created_at: '2026-09-07T16:47:48.000Z',
            status: 'completed'
        },
        {
            id: 103,
            contato_nome: 'Aryaraj Fernandes',
            telefone: '5585998259497',
            mensagem: 'Me chamo Aryaraj, qual é o seu nome?',
            dono: 'usuario',
            event_type: 'message',
            created_at: '2026-09-07T16:51:34.000Z',
            status: 'completed'
        }
    ];

    it('Deve classificar corretamente mensagens do usuário descartando agente e follow-up', () => {
        expect(isUserMessage(mockEvents[0])).toBe(true);
        expect(isUserMessage({ dono: 'agente', event_type: 'message' })).toBe(false);
        expect(isUserMessage({ dono: 'bot', event_type: 'message' })).toBe(false);
        expect(isUserMessage({ dono: 'usuario', event_type: 'followup' })).toBe(false);
        expect(isUserMessage(null)).toBe(false);
    });

    it('Deve exibir "Última mensagem do usuário" quando estiver no evento mais recente', () => {
        // Renderiza no evento 103 (o último da lista)
        render(
            <AutomationPipelineModal
                event={mockEvents[2]}
                events={mockEvents}
                webhookId={1}
                onClose={() => {}}
            />
        );

        // Badge de última mensagem deve estar visível
        const lastMsgBadge = screen.getByTestId('last-message-badge');
        expect(lastMsgBadge).toBeInTheDocument();
        expect(lastMsgBadge).toHaveTextContent(/Última mensagem do usuário/i);

        // Contador deve mostrar 3/3
        expect(screen.getByText('3/3')).toBeInTheDocument();

        // Botão Próxima deve estar desativado pois já é a última mensagem
        const nextBtn = screen.getByTestId('pipeline-next-msg-btn');
        expect(nextBtn).toBeDisabled();

        // Botão Anterior deve estar habilitado
        const prevBtn = screen.getByTestId('pipeline-prev-msg-btn');
        expect(prevBtn).not.toBeDisabled();
    });

    it('Deve exibir "Mensagem anterior (1 de 3)" quando estiver na primeira mensagem', () => {
        // Renderiza no evento 101 (o primeiro da lista)
        render(
            <AutomationPipelineModal
                event={mockEvents[0]}
                events={mockEvents}
                webhookId={1}
                onClose={() => {}}
            />
        );

        // Badge de mensagem anterior deve estar visível
        const prevMsgBadge = screen.getByTestId('previous-message-badge');
        expect(prevMsgBadge).toBeInTheDocument();
        expect(prevMsgBadge).toHaveTextContent(/Mensagem anterior \(1 de 3\)/i);

        // Contador deve mostrar 1/3
        expect(screen.getByText('1/3')).toBeInTheDocument();

        // Botão Anterior deve estar desativado na primeira mensagem
        const prevBtn = screen.getByTestId('pipeline-prev-msg-btn');
        expect(prevBtn).toBeDisabled();

        // Botão Próxima deve estar habilitado
        const nextBtn = screen.getByTestId('pipeline-next-msg-btn');
        expect(nextBtn).not.toBeDisabled();
    });

    it('Deve permitir navegar entre as mensagens ao clicar em Próxima e Anterior', () => {
        const onNavigateMock = vi.fn();

        render(
            <AutomationPipelineModal
                event={mockEvents[0]}
                events={mockEvents}
                webhookId={1}
                onClose={() => {}}
                onNavigateEvent={onNavigateMock}
            />
        );

        // Clica em Próxima
        const nextBtn = screen.getByTestId('pipeline-next-msg-btn');
        fireEvent.click(nextBtn);

        // Deve chamar onNavigateEvent com o evento 102
        expect(onNavigateMock).toHaveBeenCalledWith(mockEvents[1]);
    });

    it('PipelineHeader puro renderiza os botões e estado corretamente', () => {
        const onPrevMock = vi.fn();
        const onNextMock = vi.fn();

        render(
            <PipelineHeader
                event={mockEvents[1]}
                isLastMessage={false}
                hasPrevious={true}
                hasNext={true}
                currentIndex={1}
                totalMessages={3}
                onPrevious={onPrevMock}
                onNext={onNextMock}
                onRefresh={() => {}}
                onClose={() => {}}
            />
        );

        expect(screen.getByTestId('previous-message-badge')).toHaveTextContent(/Mensagem anterior \(2 de 3\)/i);
        expect(screen.getByText('2/3')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('pipeline-prev-msg-btn'));
        expect(onPrevMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId('pipeline-next-msg-btn'));
        expect(onNextMock).toHaveBeenCalledTimes(1);
    });
});

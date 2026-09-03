import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LeadHistoryTableRow from '../../../components/WebhookManager/components/LeadHistoryModal/components/LeadHistoryTableRow';

describe('LeadHistoryTableRow - Omissão do ícone de Cache Semântico em Follow-Up', () => {
    const defaultProps = {
        getMessageTypeLabel: (type) => type || 'Texto',
        setMaximizedText: vi.fn(),
        setSelectedPipelineEvent: vi.fn(),
        handleDeleteEvent: vi.fn(),
        handleRetryEvent: vi.fn(),
        onSaveToCache: vi.fn(),
        isRetrying: false
    };

    it('NÃO deve renderizar o botão salvar no cache (💾) quando a mensagem for de Follow-Up (event_type: followup)', () => {
        const followUpEvent = {
            id: 404,
            event_type: 'followup',
            mensagem: '[Follow-Up Passo #2]',
            agent_response: '[Template Oficial]: compra_aprovada',
            dono: 'agente',
            created_at: '2026-08-27T08:34:53'
        };

        render(
            <table>
                <tbody>
                    <LeadHistoryTableRow {...defaultProps} event={followUpEvent} />
                </tbody>
            </table>
        );

        const saveBtn = screen.queryByTitle(/Aprovar e Salvar no Cache Semântico/i);
        expect(saveBtn).toBeNull();
        expect(screen.queryByTestId('save-cache-btn-404')).toBeNull();
    });

    it('NÃO deve renderizar o botão salvar no cache (💾) quando a mensagem contiver [Follow-Up no texto', () => {
        const followUpEvent = {
            id: 403,
            event_type: 'message',
            mensagem: '[Follow-Up Passo #1]',
            agent_response: '[Template Oficial]: combo_produto_oficial',
            dono: 'agente',
            created_at: '2026-08-26T19:35:30'
        };

        render(
            <table>
                <tbody>
                    <LeadHistoryTableRow {...defaultProps} event={followUpEvent} />
                </tbody>
            </table>
        );

        const saveBtn = screen.queryByTitle(/Aprovar e Salvar no Cache Semântico/i);
        expect(saveBtn).toBeNull();
        expect(screen.queryByTestId('save-cache-btn-403')).toBeNull();
    });

    it('DEVE renderizar o botão salvar no cache (💾) para mensagem normal de lead / usuário com resposta', () => {
        const normalEvent = {
            id: 405,
            event_type: 'message',
            mensagem: 'olá, quanto custa o produto?',
            agent_response: 'Olá! O produto custa R$ 97,00.',
            dono: 'usuario',
            created_at: '2026-08-27T09:00:00'
        };

        render(
            <table>
                <tbody>
                    <LeadHistoryTableRow {...defaultProps} event={normalEvent} />
                </tbody>
            </table>
        );

        const saveBtn = screen.getByTitle(/Aprovar e Salvar no Cache Semântico/i);
        expect(saveBtn).toBeInTheDocument();
        expect(screen.getByTestId('save-cache-btn-405')).toBeInTheDocument();
    });
});

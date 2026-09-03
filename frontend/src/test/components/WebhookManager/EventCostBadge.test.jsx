import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EventCostBadge from '../../../components/WebhookManager/components/LeadHistoryModal/components/EventCostBadge';
import { getEventCostInfo } from '../../../components/WebhookManager/utils/costUtils';

describe('EventCostBadge & costUtils', () => {
    it('deve identificar resposta de cache semântico via flag direta', () => {
        const event = {
            id: 413,
            from_semantic_cache: true,
            cost: 0.0,
            agent_response: 'O curso é 100% online.'
        };

        const info = getEventCostInfo(event);
        expect(info.isCache).toBe(true);
        expect(info.isFree).toBe(true);
        expect(info.isPaid).toBe(false);
        expect(info.costFormatted).toBe('R$ 0,00');
        expect(info.label).toContain('De Graça (Cache Semântico');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/De Graça \(Cache Semântico/i)).toBeInTheDocument();
    });

    it('deve identificar resposta de cache semântico extraída de processing_steps', () => {
        const event = {
            id: 412,
            agent_response: 'Qual sua dúvida sobre o laser?',
            processing_steps: JSON.stringify([
                { step: '⚡ Cache Semântico (100.0% Similaridade · Custo Zero)', metadata: { from_semantic_cache: true, cost: 0.0 } },
                { step: '⚡ Resposta do Cache Semântico', metadata: { cost: 0.0 } }
            ])
        };

        const info = getEventCostInfo(event);
        expect(info.isCache).toBe(true);
        expect(info.isFree).toBe(true);
        expect(info.badgeType).toBe('cache');

        render(<EventCostBadge event={event} compact={true} />);
        expect(screen.getByText(/De Graça/i)).toBeInTheDocument();
    });

    it('deve identificar resposta paga de IA com custo calculado', () => {
        const event = {
            id: 411,
            agent_response: 'Combinado! Qualquer dúvida me chame.',
            cost: 0.2168,
            processing_steps: JSON.stringify([
                { step: 'Decisão da IA', metadata: { cost: 0.0224 } },
                { step: 'Resposta gerada pelo agente', metadata: { cost: 0.1944 } }
            ])
        };

        const info = getEventCostInfo(event);
        expect(info.isCache).toBe(false);
        expect(info.isPaid).toBe(true);
        expect(info.cost).toBeCloseTo(0.2168, 3);
        expect(info.badgeType).toBe('paid');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/Paga \(IA/i)).toBeInTheDocument();
    });

    it('deve identificar cache parcial + IA', () => {
        const event = {
            id: 415,
            from_semantic_cache: false,
            is_partial_cache: true,
            cost: 0.045,
            agent_response: 'Temos turmas online e suporte ao vivo.'
        };

        const info = getEventCostInfo(event);
        expect(info.isPartialCache).toBe(true);
        expect(info.badgeType).toBe('partial');
        expect(info.label).toContain('Cache Parcial + IA');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/Cache Parcial \+ IA/i)).toBeInTheDocument();
    });

    it('deve identificar follow-up como gratuito se cost for 0', () => {
        const event = {
            id: 410,
            event_type: 'followup',
            mensagem: '[Follow-Up Passo #1]',
            agent_response: '[Template Oficial]: combo_produto_oficial',
            cost: 0.0
        };

        const info = getEventCostInfo(event);
        expect(info.isFree).toBe(true);
        expect(info.badgeType).toBe('followup');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/Follow-Up \(Custo Zero\)/i)).toBeInTheDocument();
    });
});

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

    it('deve identificar resposta de atalho programático do Pre-Router como gratuita (Custo Zero)', () => {
        const event = {
            id: 494,
            mensagem: 'Oie',
            agent_response: 'oiee! Qual sua dúvida sobre o Método Laser Day?',
            cost: 0.0,
            processing_steps: JSON.stringify([
                {
                    step: '✅ Decisão da IA (Pre-Router)',
                    metadata: {
                        model: 'shortcut-logic',
                        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                        cost: 0.0
                    },
                    detail: '📊 Métricas de Consumo do Pre-Router: • Modo de Execução: Atalho Programático (Sem Custo de IA)'
                },
                {
                    step: '⏭️ Agente Principal Pulado (Saudação Direta)',
                    detail: 'O Agente Principal foi PULADO.'
                },
                {
                    step: '⚡ Resposta direta do Pre-Router',
                    metadata: { model: 'shortcut-logic' }
                }
            ])
        };

        const info = getEventCostInfo(event);
        expect(info.isShortcut).toBe(true);
        expect(info.isFree).toBe(true);
        expect(info.isPaid).toBe(false);
        expect(info.cost).toBe(0);
        expect(info.badgeType).toBe('shortcut');
        expect(info.label).toContain('De Graça (Atalho Pre-Router');
        expect(info.shortLabel).toBe('⚡ De Graça (Atalho)');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/De Graça \(Atalho Pre-Router/i)).toBeInTheDocument();
    });

    it('deve identificar qualquer resposta com custo 0 como De Graça', () => {
        const event = {
            id: 500,
            agent_response: 'Resposta sem custo de tokens.',
            cost: 0.0
        };

        const info = getEventCostInfo(event);
        expect(info.isFree).toBe(true);
        expect(info.isPaid).toBe(false);
        expect(info.badgeType).toBe('free');
        expect(info.label).toContain('De Graça');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/De Graça/i)).toBeInTheDocument();
    });

    it('deve identificar resposta importada do ZapVoice via flag is_zapvoice_import', () => {
        const event = {
            id: 572,
            agent_response: 'oiee! Qual sua dúvida sobre o Método Laser Day?',
            dono: 'agente',
            is_zapvoice_import: true,
            cost: 0.0
        };

        const info = getEventCostInfo(event);
        expect(info.isZapVoiceImport).toBe(true);
        expect(info.badgeType).toBe('zapvoice_import');
        expect(info.label).toBe('📥 Importação do ZapVoice');
        expect(info.shortLabel).toBe('📥 ZapVoice');

        render(<EventCostBadge event={event} />);
        expect(screen.getByText(/Importação do ZapVoice/i)).toBeInTheDocument();
    });

    it('deve identificar resposta importada do ZapVoice extraída de processing_steps', () => {
        const event = {
            id: 574,
            agent_response: 'Olá! Como posso te ajudar?',
            dono: 'agente',
            processing_steps: JSON.stringify([
                {
                    step: '📥 Importação do ZapVoice',
                    detail: 'Histórico importado via API do ZapJords',
                    metadata: { is_zapvoice_import: true, origin: 'zapvoice_import', cost: 0.0 }
                }
            ])
        };

        const info = getEventCostInfo(event);
        expect(info.isZapVoiceImport).toBe(true);
        expect(info.badgeType).toBe('zapvoice_import');
        expect(info.label).toBe('📥 Importação do ZapVoice');
        expect(info.shortLabel).toBe('📥 ZapVoice');

        render(<EventCostBadge event={event} compact={true} />);
        expect(screen.getByText(/ZapVoice/i)).toBeInTheDocument();
    });

    it('NÃO deve marcar como importação do ZapVoice quando for uma resposta ao vivo enviada ao ZapVoice (com passo "📤 Resposta enviada ao ZapVoice")', () => {
        const liveEvent = {
            id: 579,
            agent_response: 'Olá! Como posso te ajudar?',
            dono: 'agente',
            cost: 0.0025,
            processing_steps: JSON.stringify([
                { step: 'Pré-Router (Classificação)', cost: 0.0004 },
                { step: 'Agente Principal (GPT-4o)', cost: 0.0021 },
                { step: '📤 Resposta enviada ao ZapVoice', detail: 'Mensagem única entregue com sucesso.' }
            ])
        };

        const info = getEventCostInfo(liveEvent);
        expect(info.isZapVoiceImport).toBe(false);
        expect(info.isPaid).toBe(true);
        expect(info.badgeType).toBe('paid');
        expect(info.label).toContain('Paga (IA');

        render(<EventCostBadge event={liveEvent} />);
        expect(screen.getByText(/Paga \(IA/i)).toBeInTheDocument();
        expect(screen.queryByText(/Importação do ZapVoice/i)).toBeNull();
    });
});


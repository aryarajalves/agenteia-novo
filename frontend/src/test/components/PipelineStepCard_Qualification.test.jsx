import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PipelineStepCard from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepCard';

describe('PipelineStepCard - Lead Qualification Display', () => {
    it('deve renderizar as etiquetas aplicadas, funil ativo e classificação no card de qualificação', () => {
        const step = {
            title: '🎯 Lead Qualificado (Finalização do Funil)',
            icon: '⚡',
            content: 'Lead concluiu todas as etapas e foi etiquetado com sucesso.',
            metadata: {
                labels_applied: ['mentoria-vip', 'lead-qualificado'],
                labels_removed: ['qualificado'],
                lead_classification: 'Quente 🔥',
                lead_score: 95,
                funnel_id: 'mentoria_vip',
                funnel_name: 'Mentoria VIP Exclusiva'
            }
        };

        render(<PipelineStepCard step={step} isAllCollapsed={false} />);

        // Valida título da etapa
        expect(screen.getByText('🎯 Lead Qualificado (Finalização do Funil)')).toBeInTheDocument();

        // Valida badges no cabeçalho
        expect(screen.getByText('🎯 Mentoria VIP Exclusiva')).toBeInTheDocument();
        expect(screen.getByText(/Quente 🔥 \(95\/100\)/)).toBeInTheDocument();
        expect(screen.getByText('🏷️ mentoria-vip, lead-qualificado')).toBeInTheDocument();

        // Valida bloco visual de etiquetas do contato
        expect(screen.getByText('Etiquetas no Contato:')).toBeInTheDocument();
        expect(screen.getByText('🏷️ mentoria-vip')).toBeInTheDocument();
        expect(screen.getByText('🏷️ lead-qualificado')).toBeInTheDocument();
        expect(screen.getByText('(Removidas: qualificado)')).toBeInTheDocument();
    });

    it('deve indicar claramente quando nenhuma etiqueta foi aplicada (ex: lead frio)', () => {
        const step = {
            title: '🎯 Lead Qualificado (Finalização do Funil)',
            icon: '⚡',
            content: 'Lead avaliado como Frio. Nenhuma etiqueta aplicada.',
            metadata: {
                labels_applied: [],
                labels_removed: [],
                lead_classification: 'Frio ❄️',
                lead_score: 20,
                funnel_id: 'padrao',
                funnel_name: 'Funil Padrão'
            }
        };

        render(<PipelineStepCard step={step} isAllCollapsed={false} />);

        // Valida badges
        expect(screen.getByText('🎯 Funil Padrão')).toBeInTheDocument();
        expect(screen.getByText(/Frio ❄️ \(20\/100\)/)).toBeInTheDocument();

        // Valida indicação de nenhuma etiqueta
        expect(screen.getByText('Nenhuma etiqueta aplicada (Lead Frio ❄️)')).toBeInTheDocument();
    });

    it('deve renderizar corretamente quando a classificação for Indefinida sem pontuação e sem etiquetas removidas', () => {
        const step = {
            title: '🎯 Lead Qualificado (Finalização do Funil)',
            icon: '⚡',
            content: 'Lead concluiu as etapas sem critérios configurados.',
            metadata: {
                labels_applied: ['lead-qualificado'],
                labels_removed: [],
                lead_classification: 'Indefinida',
                lead_score: null,
                funnel_id: 'padrao',
                funnel_name: 'Funil Padrão'
            }
        };

        render(<PipelineStepCard step={step} isAllCollapsed={false} />);

        // Valida badge de Indefinida sem score /100
        expect(screen.getByText('🌡️ Indefinida')).toBeInTheDocument();
        // Não deve renderizar bloco de removidas
        expect(screen.queryByText(/Removidas:/)).not.toBeInTheDocument();
        expect(screen.getAllByText('🏷️ lead-qualificado').length).toBe(2);
    });
});

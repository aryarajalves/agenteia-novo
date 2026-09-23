import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { formatDelay, getStatusBadge } from '../../components/WebhookManager/components/FollowupPipelineModal/followupPipelineHelpers';
import PipelineHeader from '../../components/WebhookManager/components/FollowupPipelineModal/PipelineHeader';
import PipelineStepItem from '../../components/WebhookManager/components/FollowupPipelineModal/PipelineStepItem';

describe('FollowupPipelineModal Modular Helpers & Subcomponents', () => {
    describe('followupPipelineHelpers', () => {
        it('formatDelay deve formatar minutos corretamente em minutos, horas e dias', () => {
            expect(formatDelay(0)).toBe('Imediato');
            expect(formatDelay(-5)).toBe('Imediato');
            expect(formatDelay(null)).toBe('Imediato');
            expect(formatDelay(15)).toBe('15 min');
            expect(formatDelay(60)).toBe('1 hora');
            expect(formatDelay(120)).toBe('2 horas');
            expect(formatDelay(90)).toBe('1.5 horas');
            expect(formatDelay(1440)).toBe('1 dia');
            expect(formatDelay(2880)).toBe('2 dias');
        });

        it('getStatusBadge deve retornar dados visuais adequados para cada status', () => {
            expect(getStatusBadge('completed').label).toBe('✓ Disparado');
            expect(getStatusBadge('active').label).toBe('⏳ Aguardando Envio');
            expect(getStatusBadge('cancelled').label).toBe('🛑 Cancelado / Pausado');
            expect(getStatusBadge('disabled').label).toBe('⚪ Desativado');
            expect(getStatusBadge('unknown').label).toBe('⏸️ Pendente');
        });
    });

    describe('PipelineHeader Component', () => {
        it('deve renderizar informacoes do webhook, contato e badge de fluxo', () => {
            const onRefresh = vi.fn();
            const onClose = vi.fn();

            render(
                <PipelineHeader
                    webhookInfo={{ name: 'Webhook Principal' }}
                    leadInfo={{ contato_nome: 'Carlos Eduardo', telefone: '5511999998888' }}
                    pipelineData={{
                        active_funnel: { name: 'Recuperação de Vendas' },
                        status_message: 'Executando passo 1'
                    }}
                    overallStatus="active"
                    onClose={onClose}
                    onRefresh={onRefresh}
                    loading={false}
                />
            );

            expect(screen.getByText('Pipeline de Follow-Up')).toBeInTheDocument();
            expect(screen.getByText('Webhook Principal')).toBeInTheDocument();
            expect(screen.getByText(/Fluxo: Recuperação de Vendas/i)).toBeInTheDocument();
            expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
            expect(screen.getByText('Executando passo 1')).toBeInTheDocument();

            const refreshBtn = screen.getByRole('button', { name: /Atualizar/i });
            fireEvent.click(refreshBtn);
            expect(onRefresh).toHaveBeenCalledTimes(1);

            const closeBtn = screen.getByTitle('Fechar');
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('PipelineStepItem Component', () => {
        it('deve renderizar step do tipo AI com badge e prompt', () => {
            const mockStep = {
                step_number: 1,
                delay_minutes: 30,
                type: 'ai',
                custom_prompt: 'Fazer oferta especial com desconto.',
                status: 'active'
            };

            render(<PipelineStepItem step={mockStep} index={0} isLast={false} />);

            expect(screen.getByText('Passo 1: 30 min')).toBeInTheDocument();
            expect(screen.getByText(/IA Contextual/i)).toBeInTheDocument();
            expect(screen.getByText(/Fazer oferta especial com desconto./i)).toBeInTheDocument();
            expect(screen.getByText(/Aguardando Envio/i)).toBeInTheDocument();
            expect(screen.getByText(/Início da contagem/i)).toBeInTheDocument();
            expect(screen.getByText(/tempo de inatividade/i)).toBeInTheDocument();
        });

        it('deve renderizar step do tipo template whatsapp com evento disparado', () => {
            const mockStep = {
                step_number: 2,
                delay_minutes: 1440,
                type: 'whatsapp_template',
                template_name: 'aviso_boleto_vencido',
                language: 'pt_BR',
                status: 'completed',
                dispatched_event: {
                    created_at: '2026-09-18T14:30:00Z',
                    agent_response: 'Olá, seu boleto vence hoje!'
                }
            };

            render(<PipelineStepItem step={mockStep} index={1} isLast={true} />);

            expect(screen.getByText('Passo 2: 1 dia')).toBeInTheDocument();
            expect(screen.getByText(/Template WhatsApp/i)).toBeInTheDocument();
            expect(screen.getByText('aviso_boleto_vencido')).toBeInTheDocument();
            expect(screen.getByText(/Disparado com Sucesso/i)).toBeInTheDocument();
            expect(screen.getByText('"Olá, seu boleto vence hoje!"')).toBeInTheDocument();
        });
    });
});


import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FollowupStepTargetAudience from '../../components/WebhookManager/components/EditWebhookTabs/FollowupStepTargetAudience';
import FollowupStepMessageFormat from '../../components/WebhookManager/components/EditWebhookTabs/FollowupStepMessageFormat';
import FollowupMetricsModal from '../../components/WebhookManager/components/FollowupMetricsModal';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

vi.mock('../../components/WebhookManager/utils/helpers', () => ({
    showToast: vi.fn()
}));

describe('Followup Upgrades - Novos Componentes e Funcionalidades', () => {
    let mockStepItem;
    let mockUpdateStepProperty;
    let mockSafeEditForm;
    let mockSetEditForm;

    beforeEach(() => {
        vi.clearAllMocks();
        mockStepItem = {
            step_index: 0,
            delay_minutes: 15,
            type: 'ai',
            custom_prompt: 'Copy A principal',
            target_audience: 'ambos',
            lead_score_trigger: 'all',
            ab_test_enabled: false,
            variation_b_prompt: '',
            variation_b_message: ''
        };
        mockUpdateStepProperty = vi.fn();

        mockSafeEditForm = {
            id: 'test_webhook_123',
            followup_steps: [mockStepItem]
        };
        mockSetEditForm = vi.fn();
    });

    describe('FollowupStepTargetAudience (Temperatura / Lead Score)', () => {
        it('deve renderizar as opções de temperatura e destacar Qualquer Lead por padrão', () => {
            render(
                <FollowupStepTargetAudience
                    stepItem={mockStepItem}
                    updateStepProperty={mockUpdateStepProperty}
                    stepType="ai"
                />
            );

            expect(screen.getByText(/Filtro por Temperatura \/ Lead Score/i)).toBeInTheDocument();
            expect(screen.getByTestId('followup-score-all')).toBeInTheDocument();
            expect(screen.getByTestId('followup-score-hot')).toBeInTheDocument();
            expect(screen.getByTestId('followup-score-warm')).toBeInTheDocument();
            expect(screen.getByTestId('followup-score-cold')).toBeInTheDocument();
        });

        it('deve chamar updateStepProperty com "hot" ao clicar no botão Apenas Quente', () => {
            render(
                <FollowupStepTargetAudience
                    stepItem={mockStepItem}
                    updateStepProperty={mockUpdateStepProperty}
                    stepType="ai"
                />
            );

            const hotBtn = screen.getByTestId('followup-score-hot');
            fireEvent.click(hotBtn);

            expect(mockUpdateStepProperty).toHaveBeenCalledWith('lead_score_trigger', 'hot');
        });
    });

    describe('FollowupStepMessageFormat (Teste A/B de Copy)', () => {
        it('deve permitir ativar o switch de Teste A/B', () => {
            render(
                <FollowupStepMessageFormat
                    stepIndex={0}
                    stepItem={mockStepItem}
                    safeEditForm={mockSafeEditForm}
                    setEditForm={mockSetEditForm}
                    updateStepProperty={mockUpdateStepProperty}
                    zapvoiceTemplates={[]}
                    loadingTemplates={false}
                    fetchZapvoiceTemplates={vi.fn()}
                    templateSearchTerm=""
                    setTemplateSearchTerm={vi.fn()}
                />
            );

            expect(screen.getByText(/Teste A\/B de Copy/i)).toBeInTheDocument();
            const abSwitch = screen.getByTestId('followup-ab-toggle');
            expect(abSwitch).toBeInTheDocument();

            fireEvent.click(abSwitch);
            expect(mockUpdateStepProperty).toHaveBeenCalledWith('ab_test_enabled', true);
        });

        it('deve exibir abas de Variação A e B quando ab_test_enabled for true e permitir alternar', () => {
            const stepWithAB = {
                ...mockStepItem,
                ab_test_enabled: true,
                variation_b_prompt: 'Prompt alternativo B'
            };

            render(
                <FollowupStepMessageFormat
                    stepIndex={0}
                    stepItem={stepWithAB}
                    safeEditForm={mockSafeEditForm}
                    setEditForm={mockSetEditForm}
                    updateStepProperty={mockUpdateStepProperty}
                    zapvoiceTemplates={[]}
                    loadingTemplates={false}
                    fetchZapvoiceTemplates={vi.fn()}
                    templateSearchTerm=""
                    setTemplateSearchTerm={vi.fn()}
                />
            );

            expect(screen.getByTestId('followup-ab-tab-a')).toBeInTheDocument();
            const tabB = screen.getByTestId('followup-ab-tab-b');
            expect(tabB).toBeInTheDocument();

            fireEvent.click(tabB);
            expect(screen.getByPlaceholderText(/Variação B:/i)).toBeInTheDocument();
        });
    });

    describe('FollowupMetricsModal (Painel Visual de Métricas)', () => {
        it('deve carregar e renderizar os KPIs e testes A/B corretamente', async () => {
            const mockMetricsData = {
                total_dispatches: 24,
                total_replies: 12,
                overall_reply_rate: 50.0,
                steps: [
                    { step_order: 1, dispatches: 24, replies: 12, reply_rate: 50.0 }
                ],
                ab_tests: [
                    {
                        step_order: 1,
                        variation_a: { dispatches: 12, replies: 8, reply_rate: 66.7 },
                        variation_b: { dispatches: 12, replies: 4, reply_rate: 33.3 }
                    }
                ]
            };

            api.get.mockResolvedValueOnce({
                ok: true,
                json: async () => mockMetricsData
            });

            const onCloseMock = vi.fn();

            render(
                <FollowupMetricsModal
                    webhookId="test_webhook_123"
                    onClose={onCloseMock}
                />
            );

            expect(screen.getByText(/Carregando dados estatísticos/i)).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('24')).toBeInTheDocument();
                expect(screen.getByText('12')).toBeInTheDocument();
                expect(screen.getAllByText(/Passo #1/i).length).toBeGreaterThan(0);
                expect(screen.getByText(/Desempenho dos Testes A\/B/i)).toBeInTheDocument();
                expect(screen.getByText(/🏆 Vencedora/i)).toBeInTheDocument();
            });

            // Fecha o modal
            const closeBtn = screen.getByTestId('close-metrics-btn');
            fireEvent.click(closeBtn);
            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });
    });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FollowupTab from '../../components/WebhookManager/components/EditWebhookTabs/FollowupTab';

vi.mock('../../utils/helpers', () => ({
    showToast: vi.fn(),
    formatDate: vi.fn()
}));

describe('FollowupTab Sub-Abas Component', () => {
    let mockSafeEditForm;
    let mockSetEditForm;
    let mockSetActiveStepTab;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSafeEditForm = {
            followup_enabled: true,
            followup_steps: [
                { step_index: 0, delay_minutes: 5, unit: 'minutes', value: 5, fixed_message: 'Passo 1' },
                { step_index: 1, delay_minutes: 20, unit: 'minutes', value: 20, fixed_message: 'Passo 2' }
            ],
            followup_funnels: [
                {
                    id: 'followup_default',
                    name: 'Padrão / Principal',
                    is_default: true,
                    steps: [{ step_index: 0, delay_minutes: 5, fixed_message: 'Passo 1' }]
                }
            ],
            followup_business_hours: {
                enabled: true,
                start: '08:00',
                end: '18:00',
                weekdays: true,
                saturday: false,
                sunday: false
            },
            followup_on_reply: 'stop',
            abandonment_delay_value: 24,
            abandonment_delay_unit: 'hours'
        };
        mockSetEditForm = vi.fn();
        mockSetActiveStepTab = vi.fn();
    });

    it('deve renderizar as 4 sub-abas de organização interna do follow-up', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        expect(screen.getByTestId('followup-subtab-steps')).toBeInTheDocument();
        expect(screen.getByTestId('followup-subtab-hours')).toBeInTheDocument();
        expect(screen.getByTestId('followup-subtab-triggers')).toBeInTheDocument();
        expect(screen.getByTestId('followup-subtab-crm')).toBeInTheDocument();

        expect(screen.getByText('Passos & Esteiras')).toBeInTheDocument();
        expect(screen.getByText('Janela Comercial')).toBeInTheDocument();
        expect(screen.getByText('Gatilhos Inteligentes')).toBeInTheDocument();
        expect(screen.getByText('Regras de CRM')).toBeInTheDocument();
    });

    it('deve iniciar na sub-aba de Passos & Esteiras exibindo o seletor de fluxos e passos', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        expect(screen.getByTestId('followup-funnels-select')).toBeInTheDocument();
        expect(screen.getAllByText(/Passo #1/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Passo #2/i).length).toBeGreaterThanOrEqual(1);
    });

    it('deve alternar para a sub-aba de Janela Comercial ao clicar nela', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const hoursTabBtn = screen.getByTestId('followup-subtab-hours');
        fireEvent.click(hoursTabBtn);

        expect(screen.getByText(/Proteção "Não Perturbe" & Janela Comercial/i)).toBeInTheDocument();
        expect(screen.queryByTestId('followup-funnels-select')).not.toBeInTheDocument();
    });

    it('deve alternar para a sub-aba de Gatilhos Inteligentes ao clicar nela', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
                smartTriggerTab="cancel"
                setSmartTriggerTab={vi.fn()}
            />
        );

        const triggersTabBtn = screen.getByTestId('followup-subtab-triggers');
        fireEvent.click(triggersTabBtn);

        expect(screen.getByText(/Gatilhos Inteligentes & Regras de Etiquetas/i)).toBeInTheDocument();
        expect(screen.queryByTestId('followup-funnels-select')).not.toBeInTheDocument();
    });

    it('deve alternar para a sub-aba de Regras de CRM ao clicar nela', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const crmTabBtn = screen.getByTestId('followup-subtab-crm');
        fireEvent.click(crmTabBtn);

        expect(screen.getByText(/Tempo Limite para "Não Converteu \/ Desistiu"/i)).toBeInTheDocument();
        expect(screen.queryByTestId('followup-funnels-select')).not.toBeInTheDocument();
    });

    it('deve alternar o estado do switch mestre ao clicar nele', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const switchBtn = screen.getByTestId('followup-master-switch');
        fireEvent.click(switchBtn);

        expect(mockSetEditForm).toHaveBeenCalledWith(
            expect.objectContaining({
                followup_enabled: false
            })
        );
    });

    it('não deve renderizar a parte de baixo (sub-abas e conteúdos) se o follow-up estiver desativado', () => {
        render(
            <FollowupTab
                safeEditForm={{ ...mockSafeEditForm, followup_enabled: false }}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        // O cabeçalho e switch mestre ainda devem existir
        expect(screen.getByTestId('followup-master-switch')).toBeInTheDocument();
        expect(screen.getByText('Follow-Up Automático')).toBeInTheDocument();

        // Nenhuma das sub-abas ou conteúdos deve aparecer
        expect(screen.queryByTestId('followup-subtab-steps')).toBeNull();
        expect(screen.queryByTestId('followup-subtab-hours')).toBeNull();
        expect(screen.queryByTestId('followup-subtab-triggers')).toBeNull();
        expect(screen.queryByTestId('followup-subtab-crm')).toBeNull();
        expect(screen.queryByTestId('followup-funnels-select')).toBeNull();
    });

    it('deve renderizar e alternar as sub-abas internas do card de passo (Mensagem, Público e Mídia)', () => {
        render(
            <FollowupTab
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        // Sub-abas internas do passo
        const msgTab = screen.getByTestId('step-subtab-message');
        const audienceTab = screen.getByTestId('step-subtab-audience');
        const mediaTab = screen.getByTestId('step-subtab-media');

        expect(msgTab).toBeInTheDocument();
        expect(audienceTab).toBeInTheDocument();
        expect(mediaTab).toBeInTheDocument();

        // Inicia na aba Mensagem & Formato
        expect(screen.getByTestId('followup-step-type-ai')).toBeInTheDocument();
        expect(screen.getByTestId('followup-step-type-fixed')).toBeInTheDocument();
        expect(screen.getByTestId('followup-step-type-template')).toBeInTheDocument();

        // Alterna para Público & Finalidade
        fireEvent.click(audienceTab);
        expect(screen.getByTestId('followup-audience-retentativas')).toBeInTheDocument();
        expect(screen.getByTestId('followup-audience-remarketing')).toBeInTheDocument();
        expect(screen.getByTestId('followup-audience-compradores')).toBeInTheDocument();
        expect(screen.getByTestId('followup-audience-ambos')).toBeInTheDocument();

        // Alterna para Mídia & Áudio
        fireEvent.click(mediaTab);
        expect(screen.getByText(/Anexo de Mídia/i)).toBeInTheDocument();
    });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditWebhookModal from '../../components/WebhookManager/components/EditWebhookModal';
import GeralTab from '../../components/WebhookManager/components/EditWebhookTabs/GeralTab';
import SegurancaTab from '../../components/WebhookManager/components/EditWebhookTabs/SegurancaTab';
import ZapvoiceTab from '../../components/WebhookManager/components/EditWebhookTabs/ZapvoiceTab';
import FollowupTab from '../../components/WebhookManager/components/EditWebhookTabs/FollowupTab';
import AgentTabSection from '../../components/WebhookManager/components/Common/AgentTabSection';

describe('EditWebhookModal Component & Modular Tabs', () => {
    const mockEditForm = {
        name: 'WhatsApp Vendas',
        token: 'whatsapp-vendas',
        leads_table: 'leads_wpp',
        description: 'Integração de testes',
        process_audio: true,
        process_image: false,
        disable_ai_responses: false,
        delay_seconds: 15,
        response_delay_seconds: 5,
        split_response_enabled: true,
        followup_enabled: true,
        followup_steps: [
            { delay_minutes: 30, unit: 'minutes', value: 30, type: 'ai', custom_prompt: 'Olá tudo bem?', media_type: 'none' }
        ],
        allowed_contacts: ['5511999999999'],
        blocked_messages: ['palavra_ruim'],
        delete_keywords: ['#sair'],
        delete_message: 'Até logo!',
        zapvoice_url: 'https://api.zapvoice.com',
        zapvoice_api_token: 'secret-token-123',
        zapvoice_client_id: 'client_xyz'
    };

    it('deve renderizar o modal com as abas da sidebar', () => {
        const onClose = vi.fn();
        const setEditTab = vi.fn();
        const setEditForm = vi.fn();

        render(
            <EditWebhookModal
                editingWebhook={{ id: 'wh_1', name: 'WhatsApp Vendas' }}
                onClose={onClose}
                editTab="geral"
                setEditTab={setEditTab}
                editForm={mockEditForm}
                setEditForm={setEditForm}
                handleEdit={vi.fn()}
                editSaving={false}
                editError={null}
            />
        );

        expect(screen.getByText('Editar Integração')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Geral/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Agente IA/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Memória/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Segurança/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ZapVoice/i })).toBeInTheDocument();
        expect(screen.getByDisplayValue('WhatsApp Vendas')).toBeInTheDocument();
    });

    it('deve alternar abas da sidebar ao clicar', () => {
        const setEditTab = vi.fn();

        render(
            <EditWebhookModal
                editingWebhook={{ id: 'wh_1' }}
                onClose={vi.fn()}
                editTab="geral"
                setEditTab={setEditTab}
                editForm={mockEditForm}
                setEditForm={vi.fn()}
                handleEdit={vi.fn()}
            />
        );

        const segurancaTabBtn = screen.getByRole('button', { name: /Segurança/i });
        fireEvent.click(segurancaTabBtn);
        expect(setEditTab).toHaveBeenCalledWith('filtros');

        const zapvoiceTabBtn = screen.getByRole('button', { name: /ZapVoice/i });
        fireEvent.click(zapvoiceTabBtn);
        expect(setEditTab).toHaveBeenCalledWith('zapvoice');
    });

    it('deve renderizar GeralTab com sub-abas de Identificação e Comportamento', () => {
        const setEditForm = vi.fn();
        const setGeralSubTab = vi.fn();

        const { rerender } = render(
            <GeralTab
                safeEditForm={mockEditForm}
                setEditForm={setEditForm}
                geralSubTab="dados"
                setGeralSubTab={setGeralSubTab}
            />
        );

        expect(screen.getByDisplayValue('WhatsApp Vendas')).toBeInTheDocument();
        expect(screen.getByDisplayValue('whatsapp-vendas')).toBeInTheDocument();

        // Alternar para sub-aba comportamento
        rerender(
            <GeralTab
                safeEditForm={mockEditForm}
                setEditForm={setEditForm}
                geralSubTab="comportamento"
                setGeralSubTab={setGeralSubTab}
            />
        );

        expect(screen.getByText('🎙️ Áudios')).toBeInTheDocument();
        expect(screen.getByText('🖼️ Imagens')).toBeInTheDocument();
        expect(screen.getByText('🤐 Modo Silencioso (Desativar IA)')).toBeInTheDocument();
    });

    it('deve renderizar SegurancaTab com contatos permitidos e mensagens bloqueadas', () => {
        const setEditForm = vi.fn();
        const setSegurancaSubTab = vi.fn();

        const { rerender } = render(
            <SegurancaTab
                safeEditForm={mockEditForm}
                setEditForm={setEditForm}
                segurancaSubTab="permitidos"
                setSegurancaSubTab={setSegurancaSubTab}
                editAllowedInput=""
                setEditAllowedInput={vi.fn()}
                editBlockedInput=""
                setEditBlockedInput={vi.fn()}
                editDeleteInput=""
                setEditDeleteInput={vi.fn()}
            />
        );

        expect(screen.getByText('5511999999999')).toBeInTheDocument();

        rerender(
            <SegurancaTab
                safeEditForm={mockEditForm}
                setEditForm={setEditForm}
                segurancaSubTab="bloqueadas"
                setSegurancaSubTab={setSegurancaSubTab}
                editAllowedInput=""
                setEditAllowedInput={vi.fn()}
                editBlockedInput=""
                setEditBlockedInput={vi.fn()}
                editDeleteInput=""
                setEditDeleteInput={vi.fn()}
            />
        );

        expect(screen.getByText('palavra_ruim')).toBeInTheDocument();
    });

    it('deve renderizar ZapvoiceTab com credenciais e conexão', () => {
        const setEditForm = vi.fn();
        const setZapvoiceSubTab = vi.fn();

        render(
            <ZapvoiceTab
                safeEditForm={mockEditForm}
                setEditForm={setEditForm}
                zapvoiceSubTab="credenciais"
                setZapvoiceSubTab={setZapvoiceSubTab}
                showToken={false}
                setShowToken={vi.fn()}
                labelsList={[]}
            />
        );

        expect(screen.getByDisplayValue('https://api.zapvoice.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('client_xyz')).toBeInTheDocument();
    });

    it('deve renderizar FollowupTab com passos de follow-up e proteção comercial', () => {
        const setEditForm = vi.fn();
        const setActiveFollowupStepTab = vi.fn();
        const setSmartTriggerTab = vi.fn();

        render(
            <FollowupTab
                safeEditForm={mockEditForm}
                setEditForm={setEditForm}
                activeFollowupStepTab={0}
                setActiveFollowupStepTab={setActiveFollowupStepTab}
                smartTriggerTab="cancel"
                setSmartTriggerTab={setSmartTriggerTab}
                zapvoiceTemplates={[]}
                labelsList={[]}
            />
        );

        expect(screen.getAllByText(/Passo #1/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId('followup-subtab-steps')).toBeInTheDocument();
        expect(screen.getByTestId('followup-subtab-hours')).toBeInTheDocument();
        expect(screen.getByTestId('followup-subtab-triggers')).toBeInTheDocument();
        expect(screen.getByTestId('followup-subtab-crm')).toBeInTheDocument();
        expect(screen.getByText('➕ Novo Passo')).toBeInTheDocument();
    });

    it('deve renderizar AgentTabSection com botão Sincronizar IA e acionar função ao clicar', () => {
        const handleGenerate = vi.fn();
        const mockAgents = [
            { id: 1, name: 'Tarcira', description: 'Especialista em vendas' },
            { id: 2, name: 'Suporte', description: 'Atendimento geral' }
        ];

        const { rerender } = render(
            <AgentTabSection
                safeEditForm={{ agent_id: 1, secondary_agent_ids: [] }}
                setEditForm={vi.fn()}
                agentsList={mockAgents}
                handleGenerateDescription={handleGenerate}
                syncingAgentId={null}
            />
        );

        expect(screen.getByText('Contexto do Agente')).toBeInTheDocument();
        expect(screen.getByText('Especialista em vendas')).toBeInTheDocument();
        const syncButton = screen.getByRole('button', { name: /✨ Sincronizar IA/i });
        expect(syncButton).toBeInTheDocument();
        expect(syncButton).not.toBeDisabled();

        fireEvent.click(syncButton);
        expect(handleGenerate).toHaveBeenCalledWith(1);

        // Quando estiver sincronizando, o botão deve mudar de texto e ficar desabilitado
        rerender(
            <AgentTabSection
                safeEditForm={{ agent_id: 1, secondary_agent_ids: [] }}
                setEditForm={vi.fn()}
                agentsList={mockAgents}
                handleGenerateDescription={handleGenerate}
                syncingAgentId={1}
            />
        );

        const syncingButton = screen.getByRole('button', { name: /⏳ Sincronizando.../i });
        expect(syncingButton).toBeInTheDocument();
        expect(syncingButton).toBeDisabled();
    });
});

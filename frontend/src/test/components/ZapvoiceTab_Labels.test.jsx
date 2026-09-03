import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ZapvoiceTab from '../../components/WebhookManager/components/EditWebhookTabs/ZapvoiceTab';

describe('ZapvoiceTab Component', () => {
    const mockSafeEditForm = {
        zapvoice_url: 'https://api.zapvoice.com',
        zapvoice_api_token: 'test_token',
        zapvoice_client_id: 'client_123',
        labels_on_message: [],
        followup_cancel_label: 'cancelar_robo',
        purchased_label: 'aluno_comprou',
        ignore_by_label: 'humano',
        negative_feedback_label: '',
        window_close_label: []
    };

    const mockLabelsList = ['cancelar_robo', 'aluno_comprou', 'humano', 'lead_quente'];

    it('renders credenciais sub-tab by default', () => {
        render(
            <ZapvoiceTab
                safeEditForm={mockSafeEditForm}
                setEditForm={vi.fn()}
                zapvoiceSubTab="credenciais"
                setZapvoiceSubTab={vi.fn()}
                showToken={false}
                setShowToken={vi.fn()}
                labelsList={mockLabelsList}
            />
        );

        expect(screen.getByText('Integração ZapVoice')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ex: https://api.zapvoice.com')).toBeInTheDocument();
    });

    it('renders etiquetas automáticas sub-tab with cancel and purchased labels', () => {
        render(
            <ZapvoiceTab
                safeEditForm={mockSafeEditForm}
                setEditForm={vi.fn()}
                zapvoiceSubTab="etiquetas"
                setZapvoiceSubTab={vi.fn()}
                showToken={false}
                setShowToken={vi.fn()}
                labelsList={mockLabelsList}
                labelsLoading={false}
            />
        );

        expect(screen.getByText(/Cancelar 100% Follow-up & Disparos/i)).toBeInTheDocument();
        expect(screen.getByText(/Compra Realizada \/ Aluno \(CRM\)/i)).toBeInTheDocument();
    });

    it('triggers setEditForm when changing labels', () => {
        const setEditFormMock = vi.fn();

        render(
            <ZapvoiceTab
                safeEditForm={mockSafeEditForm}
                setEditForm={setEditFormMock}
                zapvoiceSubTab="etiquetas"
                setZapvoiceSubTab={vi.fn()}
                showToken={false}
                setShowToken={vi.fn()}
                labelsList={mockLabelsList}
                labelsLoading={false}
            />
        );

        expect(screen.getByText(/Cancelar 100% Follow-up & Disparos/i)).toBeInTheDocument();
    });
});

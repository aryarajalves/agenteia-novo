import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ZapvoiceTab from '../../../src/components/WebhookManager/components/EditWebhookTabs/ZapvoiceTab';

describe('ZapvoiceTab Componente', () => {
    const defaultForm = {
        zapvoice_url: 'https://api.aryaraj.shop',
        zapvoice_api_token: 'zv_live_123',
        zapvoice_client_id: '11',
        labels_on_message: ['robo', 'whatsapp'],
        followup_cancel_label: 'compra-aprovada',
        purchased_label: 'aluno',
        ignore_by_label: 'pausar',
        negative_feedback_label: 'feedback_ruim',
        window_close_label: ['24-horas']
    };

    it('deve renderizar todos os 6 campos de etiquetas automáticas mesmo quando labelsList estiver vazio', () => {
        render(
            <ZapvoiceTab
                safeEditForm={defaultForm}
                setEditForm={vi.fn()}
                zapvoiceSubTab="etiquetas"
                setZapvoiceSubTab={vi.fn()}
                showToken={false}
                setShowToken={vi.fn()}
                labelsList={[]}
                labelsLoading={false}
                fetchChatwootLabels={vi.fn()}
            />
        );

        // Deve exibir o título e a sub-aba
        expect(screen.getAllByText(/Etiquetas Automáticas/i).length).toBeGreaterThanOrEqual(2);

        // Deve exibir todos os 6 campos de etiquetas
        expect(screen.getByText(/Em cada mensagem/i)).toBeInTheDocument();
        expect(screen.getByText(/Cancelar 100% Follow-up & Disparos/i)).toBeInTheDocument();
        expect(screen.getByText(/Compra Realizada \/ Aluno/i)).toBeInTheDocument();
        expect(screen.getByText(/Pausar se tiver etiqueta/i)).toBeInTheDocument();
        expect(screen.getByText(/Feedback Negativo/i)).toBeInTheDocument();
        expect(screen.getByText(/Remover após janela 24h expirar/i)).toBeInTheDocument();

        // Deve exibir as etiquetas já selecionadas nos inputs
        expect(screen.getByText('robo')).toBeInTheDocument();
        expect(screen.getByText('whatsapp')).toBeInTheDocument();
        expect(screen.getByText('24-horas')).toBeInTheDocument();
    });

    it('deve chamar fetchChatwootLabels com as credenciais ao clicar no botão Sincronizar Etiquetas', () => {
        const fetchMock = vi.fn();
        render(
            <ZapvoiceTab
                safeEditForm={defaultForm}
                setEditForm={vi.fn()}
                zapvoiceSubTab="etiquetas"
                setZapvoiceSubTab={vi.fn()}
                showToken={false}
                setShowToken={vi.fn()}
                labelsList={['robo', 'whatsapp']}
                labelsLoading={false}
                fetchChatwootLabels={fetchMock}
            />
        );

        const syncBtn = screen.getByRole('button', { name: /Sincronizar Etiquetas/i });
        fireEvent.click(syncBtn);

        expect(fetchMock).toHaveBeenCalledWith({
            zapvoice_url: 'https://api.aryaraj.shop',
            zapvoice_api_token: 'zv_live_123',
            zapvoice_client_id: '11'
        });
    });
});

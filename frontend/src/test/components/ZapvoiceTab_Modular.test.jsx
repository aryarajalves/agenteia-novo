import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ZapvoiceSubTabsNav from '../../components/WebhookManager/components/EditWebhookTabs/ZapvoiceTabModules/components/ZapvoiceSubTabsNav';
import ZapvoiceCredentialsSubTab from '../../components/WebhookManager/components/EditWebhookTabs/ZapvoiceTabModules/components/ZapvoiceCredentialsSubTab';
import ZapvoiceHandoffSubTab from '../../components/WebhookManager/components/EditWebhookTabs/ZapvoiceTabModules/components/ZapvoiceHandoffSubTab';
import ZapvoiceProjectSubTab from '../../components/WebhookManager/components/EditWebhookTabs/ZapvoiceTabModules/components/ZapvoiceProjectSubTab';

describe('ZapvoiceTabModules - Subcomponentes Isolados', () => {
    describe('ZapvoiceSubTabsNav', () => {
        it('deve renderizar os 4 botões de navegação e disparar setZapvoiceSubTab', () => {
            const setZapvoiceSubTab = vi.fn();
            render(
                <ZapvoiceSubTabsNav
                    zapvoiceSubTab="credenciais"
                    setZapvoiceSubTab={setZapvoiceSubTab}
                />
            );

            expect(screen.getByText(/Credenciais & Conexão/i)).toBeInTheDocument();
            expect(screen.getByText(/Etiquetas Automáticas/i)).toBeInTheDocument();
            expect(screen.getByText(/Suporte & Handoff/i)).toBeInTheDocument();
            expect(screen.getByText(/Assistente de Projeto/i)).toBeInTheDocument();

            fireEvent.click(screen.getByText(/Etiquetas Automáticas/i));
            expect(setZapvoiceSubTab).toHaveBeenCalledWith('etiquetas');

            fireEvent.click(screen.getByText(/Suporte & Handoff/i));
            expect(setZapvoiceSubTab).toHaveBeenCalledWith('handoff');

            fireEvent.click(screen.getByText(/Assistente de Projeto/i));
            expect(setZapvoiceSubTab).toHaveBeenCalledWith('projeto');
        });
    });

    describe('ZapvoiceCredentialsSubTab', () => {
        it('deve alternar a visibilidade do token e permitir editar URL e Client ID', () => {
            const setEditForm = vi.fn();
            const setShowToken = vi.fn();

            render(
                <ZapvoiceCredentialsSubTab
                    safeEditForm={{
                        zapvoice_url: 'https://api.zapvoice.com',
                        zapvoice_api_token: 'secret-token-123',
                        zapvoice_client_id: 'client_abc'
                    }}
                    setEditForm={setEditForm}
                    showToken={false}
                    setShowToken={setShowToken}
                />
            );

            expect(screen.getByDisplayValue('https://api.zapvoice.com')).toBeInTheDocument();
            expect(screen.getByDisplayValue('client_abc')).toBeInTheDocument();

            const toggleTokenBtn = screen.getByTitle('Mostrar Token');
            fireEvent.click(toggleTokenBtn);
            expect(setShowToken).toHaveBeenCalledWith(true);

            const urlInput = screen.getByDisplayValue('https://api.zapvoice.com');
            fireEvent.change(urlInput, { target: { value: 'https://novo.zapvoice.com' } });
            expect(setEditForm).toHaveBeenCalledWith(expect.objectContaining({
                zapvoice_url: 'https://novo.zapvoice.com'
            }));
        });
    });

    describe('ZapvoiceHandoffSubTab', () => {
        it('deve renderizar campos de palavra-chave e mensagem de suporte e retorno', () => {
            const setEditForm = vi.fn();

            render(
                <ZapvoiceHandoffSubTab
                    safeEditForm={{
                        handoff_keyword: '#atendimento',
                        handoff_message: 'Transferindo para humano...',
                        ai_handoff_keyword: '#voltar',
                        ai_handoff_message: 'Retomando IA...'
                    }}
                    setEditForm={setEditForm}
                    labelsList={['suporte', 'atendimento']}
                />
            );

            expect(screen.getByDisplayValue('#atendimento')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Transferindo para humano...')).toBeInTheDocument();
            expect(screen.getByDisplayValue('#voltar')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Retomando IA...')).toBeInTheDocument();

            const keywordInput = screen.getByDisplayValue('#atendimento');
            fireEvent.change(keywordInput, { target: { value: '#humano' } });
            expect(setEditForm).toHaveBeenCalledWith(expect.objectContaining({
                handoff_keyword: '#humano'
            }));
        });
    });

    describe('ZapvoiceProjectSubTab', () => {
        it('deve renderizar campos do Assistente de Projeto e disparar edições', () => {
            const setEditForm = vi.fn();

            render(
                <ZapvoiceProjectSubTab
                    safeEditForm={{
                        project_assistant_label: 'projeto_ativo',
                        project_assistant_keyword: '#projeto',
                        project_assistant_deactivate_keyword: '#sair_projeto',
                        project_assistant_entry_message: 'Iniciando modo projeto',
                        project_assistant_exit_message: 'Saindo do modo projeto'
                    }}
                    setEditForm={setEditForm}
                    labelsList={['projeto_ativo']}
                />
            );

            expect(screen.getByDisplayValue('#projeto')).toBeInTheDocument();
            expect(screen.getByDisplayValue('#sair_projeto')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Iniciando modo projeto')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Saindo do modo projeto')).toBeInTheDocument();

            const entryInput = screen.getByDisplayValue('Iniciando modo projeto');
            fireEvent.change(entryInput, { target: { value: 'Novo início' } });
            expect(setEditForm).toHaveBeenCalledWith(expect.objectContaining({
                project_assistant_entry_message: 'Novo início'
            }));
        });
    });
});

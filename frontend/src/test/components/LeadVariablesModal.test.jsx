import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import LeadVariablesModal from '../../components/WebhookManager/components/LeadVariablesModal';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn()
    }
}));

describe('LeadVariablesModal Component', () => {
    const mockLead = {
        id: 10,
        contato_nome: 'Aryaraj Fernandes',
        telefone: '5585998259497'
    };

    const mockResponseData = {
        lead: mockLead,
        total_variables: 3,
        total_captured: 2,
        total_pending: 1,
        variables: [
            {
                id: 1,
                key: 'nicho_mercado',
                type: 'string',
                description: 'Nicho de atuação do cliente',
                extraction_method: 'ai',
                has_value: true,
                value: 'Estética e Beleza',
                origin: 'ai',
                source_message: 'Eu trabalho com estética e remoção de tatuagem',
                updated_at: '2026-09-04T12:00:00'
            },
            {
                id: 2,
                key: 'faturamento_mensal',
                type: 'number',
                description: 'Faturamento mensal declarado',
                extraction_method: 'ai',
                has_value: false,
                value: null,
                origin: 'ai'
            },
            {
                id: 3,
                key: 'contact_name',
                type: 'string',
                description: 'Nome do contato',
                extraction_method: 'integration',
                has_value: true,
                value: 'Aryaraj Fernandes',
                origin: 'contact_profile'
            }
        ]
    };

    beforeEach(() => {
        api.get.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponseData)
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('não deve renderizar quando isOpen for false', () => {
        render(
            <LeadVariablesModal
                isOpen={false}
                lead={mockLead}
                webhookId={1}
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByTestId('lead-vars-modal')).not.toBeInTheDocument();
    });

    it('deve carregar dados da API e renderizar variáveis com status capturado e pendente', async () => {
        render(
            <LeadVariablesModal
                isOpen={true}
                lead={mockLead}
                webhookId={1}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('Variáveis do Contato')).toBeInTheDocument();
        expect(screen.getByText('5585998259497')).toBeInTheDocument();

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/webhooks/1/leads/10/variables');
        });

        // Deve exibir as chaves das variáveis
        expect(await screen.findByText('{nicho_mercado}')).toBeInTheDocument();
        expect(screen.getByText('Estética e Beleza')).toBeInTheDocument();
        expect(screen.getByText(/Eu trabalho com estética/)).toBeInTheDocument();

        // Variável pendente deve exibir aviso de vazio
        expect(screen.getByText('{faturamento_mensal}')).toBeInTheDocument();
        expect(screen.getByText(/Nenhum valor capturado ainda/)).toBeInTheDocument();
    });

    it('não deve fechar ao clicar no overlay de fundo', async () => {
        const onClose = vi.fn();
        render(
            <LeadVariablesModal
                isOpen={true}
                lead={mockLead}
                webhookId={1}
                onClose={onClose}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('lead-vars-modal')).toBeInTheDocument();
        });

        const overlay = screen.getByTestId('lead-vars-overlay');
        fireEvent.click(overlay);

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('lead-vars-modal')).toBeInTheDocument();
    });

    it('deve filtrar as variáveis ao clicar nas abas Capturadas e Pendentes', async () => {
        render(
            <LeadVariablesModal
                isOpen={true}
                lead={mockLead}
                webhookId={1}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('{nicho_mercado}')).toBeInTheDocument();
        });

        // Clicar na aba Pendentes
        const pendingTab = screen.getByText(/Pendentes \(1\)/);
        fireEvent.click(pendingTab);

        expect(screen.getByText('{faturamento_mensal}')).toBeInTheDocument();
        expect(screen.queryByText('{nicho_mercado}')).not.toBeInTheDocument();

        // Clicar na aba Capturadas
        const capturedTab = screen.getByText(/Capturadas \(2\)/);
        fireEvent.click(capturedTab);

        expect(screen.getByText('{nicho_mercado}')).toBeInTheDocument();
        expect(screen.getByText('{contact_name}')).toBeInTheDocument();
        expect(screen.queryByText('{faturamento_mensal}')).not.toBeInTheDocument();
    });

    it('deve fechar ao clicar no botão Fechar', async () => {
        const onClose = vi.fn();
        render(
            <LeadVariablesModal
                isOpen={true}
                lead={mockLead}
                webhookId={1}
                onClose={onClose}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('lead-vars-close-btn')).toBeInTheDocument();
        });

        const closeBtn = screen.getByTestId('lead-vars-close-btn');
        fireEvent.click(closeBtn);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('deve exibir badges e banners distintos para Valor Padrão Inicial e Extraído da Conversa', async () => {
        const customMockData = {
            lead: mockLead,
            total_variables: 2,
            total_captured: 2,
            total_pending: 0,
            variables: [
                {
                    id: 101,
                    key: 'link_enviado',
                    type: 'boolean',
                    description: 'Indica se o link de compra foi enviado',
                    default_value: 'false',
                    value: 'false',
                    has_value: true,
                    is_default_value: true,
                    value_origin: 'initial_default',
                    origin: 'default'
                },
                {
                    id: 102,
                    key: 'faturamento_desejado',
                    type: 'string',
                    description: 'Faturamento informado pelo cliente',
                    value: '7000',
                    has_value: true,
                    is_default_value: false,
                    is_extracted_from_conversation: true,
                    value_origin: 'conversation_extracted',
                    origin: 'ai',
                    source_message: 'Eu tô pensando em conseguir uns 7000 de faturamento'
                }
            ]
        };

        api.get.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(customMockData)
        });

        render(
            <LeadVariablesModal
                isOpen={true}
                lead={mockLead}
                webhookId={1}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('{link_enviado}')).toBeInTheDocument();
        });

        // Validar que a variável padrão inicial exibe o badge e banner adequados
        const defaultBadge = screen.getByTestId('lead-var-origin-link_enviado');
        expect(defaultBadge).toHaveTextContent('Valor Padrão Inicial');
        expect(screen.getByText(/Este valor é o padrão configurado no cadastro da variável/)).toBeInTheDocument();

        // Validar que a variável extraída da conversa exibe o badge e o trecho da conversa
        const extractedBadge = screen.getByTestId('lead-var-origin-faturamento_desejado');
        expect(extractedBadge).toHaveTextContent('Extraído da Conversa');
        expect(screen.getByText(/Extraído da Conversa com o Usuário/)).toBeInTheDocument();
        expect(screen.getByText(/Eu tô pensando em conseguir uns 7000 de faturamento/)).toBeInTheDocument();
    });
});

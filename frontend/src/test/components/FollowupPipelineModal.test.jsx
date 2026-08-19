import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FollowupPipelineModal from '../../components/WebhookManager/components/FollowupPipelineModal';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

describe('FollowupPipelineModal Component', () => {
    const mockLead = {
        id: 10,
        contato_nome: 'Aryaraj Alves',
        telefone: '5585996123586',
        followup_step: 0,
        ultima_mensagem_em: '2026-08-15T10:00:00Z',
        labels: ['robo', '24-horas']
    };

    const mockWebhook = {
        id: 1,
        name: 'WhatsApp Teste',
        followup_enabled: true
    };

    const mockPipelineData = {
        lead: mockLead,
        webhook: mockWebhook,
        overall_status: 'active',
        status_message: 'Aguardando disparo do Passo 1',
        steps: [
            {
                step_index: 0,
                step_number: 1,
                delay_minutes: 5,
                type: 'ai',
                custom_prompt: 'Retome a conversa de forma gentil.',
                fixed_message: '',
                media_type: 'none',
                status: 'active',
                dispatched_event: null
            },
            {
                step_index: 1,
                step_number: 2,
                delay_minutes: 60,
                type: 'fixed',
                custom_prompt: '',
                fixed_message: 'Ainda deseja saber mais?',
                media_type: 'none',
                status: 'pending',
                dispatched_event: null
            }
        ],
        executed_events: [],
        server_now: '2026-08-15 11:00:00'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockReset();
    });

    it('deve carregar e renderizar os dados da pipeline de follow-up com sucesso', async () => {
        api.get.mockImplementation(async () => ({
            ok: true,
            status: 200,
            json: async () => mockPipelineData
        }));

        const onClose = vi.fn();
        render(<FollowupPipelineModal lead={mockLead} webhook={mockWebhook} onClose={onClose} />);

        // Verificar loading inicial
        expect(screen.getByText(/Carregando linha do tempo de follow-up.../i)).toBeInTheDocument();

        // Aguardar carregamento dos dados
        await waitFor(() => {
            expect(screen.getByText('Pipeline de Follow-Up')).toBeInTheDocument();
            expect(screen.getByText('Aryaraj Alves')).toBeInTheDocument();
            expect(screen.getByText('Aguardando disparo do Passo 1')).toBeInTheDocument();
            expect(screen.getByText(/Passo 1: 5 min/i)).toBeInTheDocument();
            expect(screen.getByText(/Passo 2: 1 hora/i)).toBeInTheDocument();
        });
    });

    it('deve exibir aviso quando não houver passos configurados', async () => {
        api.get.mockImplementation(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                ...mockPipelineData,
                overall_status: 'no_steps',
                status_message: 'Nenhum passo de follow-up configurado',
                steps: []
            })
        }));

        const onClose = vi.fn();
        render(<FollowupPipelineModal lead={mockLead} webhook={mockWebhook} onClose={onClose} />);

        await waitFor(() => {
            expect(screen.getByText('Nenhum Passo de Follow-Up Configurado')).toBeInTheDocument();
        });
    });

    it('deve chamar onClose ao clicar no botão Fechar e no botão ✕', async () => {
        api.get.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockPipelineData
        });

        const onClose = vi.fn();
        render(<FollowupPipelineModal lead={mockLead} webhook={mockWebhook} onClose={onClose} />);

        await waitFor(() => {
            expect(screen.getByText('Pipeline de Follow-Up')).toBeInTheDocument();
        });

        const btnCloseBottom = screen.getByRole('button', { name: 'Fechar' });
        fireEvent.click(btnCloseBottom);
        expect(onClose).toHaveBeenCalledTimes(1);

        const btnCloseTop = screen.getByTitle('Fechar');
        fireEvent.click(btnCloseTop);
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

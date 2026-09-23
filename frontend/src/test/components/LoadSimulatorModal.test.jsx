import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoadSimulatorModal from '../../components/WebhookManager/components/LoadSimulatorModal';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        post: vi.fn()
    }
}));

describe('LoadSimulatorModal Component', () => {
    const mockWebhook = {
        id: 1,
        name: 'WhatsApp Teste',
        leads_table: 'leads_test',
        delay_seconds: 45
    };

    const mockSuccessResponse = {
        ok: true,
        json: async () => ({
            ok: true,
            total_requested: 50,
            contacts_processed: 50,
            errors_count: 0,
            elapsed_ms: 120,
            throughput_per_sec: 416.7,
            avg_latency_ms: 2.4,
            message: 'Simulação concluída com sucesso'
        })
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.post.mockResolvedValue(mockSuccessResponse);
    });

    it('deve renderizar o modal de simulação com título e opções de contatos', () => {
        render(
            <LoadSimulatorModal 
                webhook={mockWebhook} 
                onClose={() => {}} 
            />
        );

        expect(screen.getByText('Simulador de Carga & Escala')).toBeDefined();
        expect(screen.getByText(/WhatsApp Teste/)).toBeDefined();
        expect(screen.getByText('50 contatos')).toBeDefined();
        expect(screen.getByText('⚡ Iniciar Simulação de Carga')).toBeDefined();
    });

    it('deve permitir alterar a quantidade de contatos fictícios ao clicar nos botões rápidos', () => {
        render(
            <LoadSimulatorModal 
                webhook={mockWebhook} 
                onClose={() => {}} 
            />
        );

        const btn100 = screen.getByText('100 contatos');
        fireEvent.click(btn100);

        const inputCount = screen.getByRole('spinbutton');
        expect(inputCount.value).toBe('100');
    });

    it('deve chamar onClose ao clicar no botão de fechar', () => {
        const onCloseMock = vi.fn();
        render(
            <LoadSimulatorModal 
                webhook={mockWebhook} 
                onClose={onCloseMock} 
            />
        );

        const closeBtn = screen.getByText('✕');
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('deve alternar o checkbox de delay de agrupamento', () => {
        render(
            <LoadSimulatorModal 
                webhook={mockWebhook} 
                onClose={() => {}} 
            />
        );

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox.checked).toBe(false);

        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(true);
    });

    it('deve executar simulação de carga e exibir resultados de benchmark', async () => {
        const onFinishMock = vi.fn();
        const onViewLeadsMock = vi.fn();

        render(
            <LoadSimulatorModal 
                webhook={mockWebhook} 
                onClose={() => {}} 
                onFinish={onFinishMock}
                onViewLeads={onViewLeadsMock}
            />
        );

        const startBtn = screen.getByText('⚡ Iniciar Simulação de Carga');
        fireEvent.click(startBtn);

        await waitFor(() => {
            expect(screen.getByText('✅ Simulação concluída com sucesso')).toBeDefined();
        });

        expect(screen.getByText(/416.7/)).toBeDefined();
        expect(screen.getByText(/2.4/)).toBeDefined();
        expect(screen.getByText('50 / 50')).toBeDefined();
        expect(onFinishMock).toHaveBeenCalledTimes(1);

        // Testar botão de ver contatos gerados
        const viewLeadsBtn = screen.getByText('👥 Ver Contatos Gerados');
        fireEvent.click(viewLeadsBtn);
        expect(onViewLeadsMock).toHaveBeenCalledWith(mockWebhook);

        // Testar botão de novo teste
        const resetBtn = screen.getByText('🔄 Novo Teste');
        fireEvent.click(resetBtn);

        // Deve voltar para o formulário
        expect(screen.getByText('⚡ Iniciar Simulação de Carga')).toBeDefined();
    });

    it('deve exibir mensagem de erro quando a API falha na simulação', async () => {
        api.post.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                ok: false,
                detail: 'Limite de concorrência excedido'
            })
        });

        render(
            <LoadSimulatorModal 
                webhook={mockWebhook} 
                onClose={() => {}} 
            />
        );

        const startBtn = screen.getByText('⚡ Iniciar Simulação de Carga');
        fireEvent.click(startBtn);

        await waitFor(() => {
            expect(screen.getByText('⚠️ Limite de concorrência excedido')).toBeDefined();
        });
    });
});

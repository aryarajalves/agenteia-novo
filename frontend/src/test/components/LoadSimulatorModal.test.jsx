import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadSimulatorModal from '../../components/WebhookManager/components/LoadSimulatorModal';

vi.mock('../../api/client', () => ({
    api: {
        post: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                ok: true,
                total_requested: 50,
                contacts_processed: 50,
                errors_count: 0,
                elapsed_ms: 120,
                throughput_per_sec: 416.7,
                avg_latency_ms: 2.4,
                message: 'Simulação concluída com sucesso'
            })
        }))
    }
}));

describe('LoadSimulatorModal Component', () => {
    const mockWebhook = {
        id: 1,
        name: 'WhatsApp Teste',
        leads_table: 'leads_test'
    };

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
});

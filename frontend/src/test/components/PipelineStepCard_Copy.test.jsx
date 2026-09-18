import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import PipelineStepCard from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepCard';
import PipelineActionToolbar from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineActionToolbar';

describe('PipelineStepCard & PipelineActionToolbar - Copy & Toast Notifications', () => {
    let dispatchSpy;
    let writeTextSpy;

    beforeEach(() => {
        dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        writeTextSpy = vi.fn().mockResolvedValue(undefined);

        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextSpy,
            },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve copiar o conteúdo do passo e disparar toast de sucesso ao clicar no botão de copiar em PipelineStepCard', async () => {
        const step = {
            id: 'step_1',
            title: 'Adicionando etiquetas automáticas',
            icon: '🏷️',
            content: 'Etiquetas aplicadas com sucesso: lead-quente',
            timestampFormatted: '20:30:00',
            durationFormatted: '12ms'
        };

        render(<PipelineStepCard step={step} isAllCollapsed={false} />);

        const copyBtn = screen.getByRole('button', { name: /copiar/i });
        expect(copyBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(copyBtn);
        });

        // Valida que escreveu no clipboard
        expect(writeTextSpy).toHaveBeenCalledWith('Etiquetas aplicadas com sucesso: lead-quente');

        // Valida que o evento app:toast foi disparado na window
        await waitFor(() => {
            const toastEvent = dispatchSpy.mock.calls.find(
                call => call[0].type === 'app:toast' && call[0].detail?.type === 'success'
            )?.[0];
            expect(toastEvent).toBeDefined();
            expect(toastEvent.detail.message).toBe('Copiado para a área de transferência!');
        });

        // Valida que o texto do botão mudou temporariamente para Copiado!
        expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });

    it('deve disparar toast com type=error caso a cópia para a área de transferência falhe', async () => {
        writeTextSpy.mockRejectedValueOnce(new Error('Clipboard permission denied'));

        const step = {
            id: 'step_2',
            title: 'Conectando ao agente',
            icon: '🤖',
            content: 'Prompt enviado ao modelo',
        };

        render(<PipelineStepCard step={step} isAllCollapsed={false} />);

        const copyBtn = screen.getByRole('button', { name: /copiar/i });

        await act(async () => {
            fireEvent.click(copyBtn);
        });

        await waitFor(() => {
            const toastErrorEvent = dispatchSpy.mock.calls.find(
                call => call[0].type === 'app:toast' && call[0].detail?.type === 'error'
            )?.[0];
            expect(toastErrorEvent).toBeDefined();
            expect(toastErrorEvent.detail.message).toBe('Erro ao copiar conteúdo.');
        });
    });

    it('deve disparar toast de sucesso ao copiar o JSON do pipeline no PipelineActionToolbar', async () => {
        const mockEvent = {
            id: 123,
            session_id: 'sess-456',
            status: 'completed'
        };
        const mockSteps = [
            { id: 1, title: 'Passo 1', category: 'agent', content: 'Info' }
        ];
        const mockMetrics = {
            totalDuration: '1.2s',
            totalTokens: 150,
            estimatedCost: '0.002'
        };

        render(
            <PipelineActionToolbar
                event={mockEvent}
                webhookId={1}
                steps={mockSteps}
                metrics={mockMetrics}
                onRefresh={vi.fn()}
                isAllCollapsed={false}
                onToggleCollapseAll={vi.fn()}
            />
        );

        const copyPipelineBtn = screen.getByRole('button', { name: /copiar pipeline/i });
        expect(copyPipelineBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(copyPipelineBtn);
        });

        expect(writeTextSpy).toHaveBeenCalled();

        await waitFor(() => {
            const toastEvent = dispatchSpy.mock.calls.find(
                call => call[0].type === 'app:toast' && call[0].detail?.message?.includes('Pipeline copiado')
            )?.[0];
            expect(toastEvent).toBeDefined();
            expect(toastEvent.detail.type).toBe('success');
            expect(toastEvent.detail.message).toBe('Pipeline copiado para a área de transferência!');
        });
    });
});

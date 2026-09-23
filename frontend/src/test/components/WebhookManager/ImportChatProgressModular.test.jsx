import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
    formatDuration,
    useImportChatProgress,
    ImportChatHeader,
    ImportChatProgressBar,
    ImportChatStatusBox,
    ImportChatCounters,
    ImportChatActions,
    ImportChatCancelModal
} from '../../../components/WebhookManager/components/ImportChatProgressModal/index';

describe('ImportChatProgress Modular Subcomponents and Utils', () => {
    describe('formatDuration utility', () => {
        it('deve formatar segundos em MM:SS ou HH:MM:SS corretamente', () => {
            expect(formatDuration(0)).toBe('00:00');
            expect(formatDuration(45)).toBe('00:45');
            expect(formatDuration(65)).toBe('01:05');
            expect(formatDuration(600)).toBe('10:00');
            expect(formatDuration(3665)).toBe('01:01:05');
        });
    });

    describe('ImportChatHeader', () => {
        it('deve exibir títulos e ícones de acordo com o status', () => {
            const { rerender } = render(<ImportChatHeader done={false} cancelled={false} error={null} />);
            expect(screen.getByText('Importando do ZapJords')).toBeInTheDocument();
            expect(screen.getByText('📥')).toBeInTheDocument();

            rerender(<ImportChatHeader done={true} cancelled={false} error={null} />);
            expect(screen.getByText('Importação Concluída!')).toBeInTheDocument();
            expect(screen.getByText('✅')).toBeInTheDocument();

            rerender(<ImportChatHeader done={false} cancelled={true} error={null} />);
            expect(screen.getByText('Importação Cancelada')).toBeInTheDocument();
            expect(screen.getByText('🛑')).toBeInTheDocument();

            rerender(<ImportChatHeader done={false} cancelled={false} error="Erro grave" />);
            expect(screen.getByText('Erro na Importação')).toBeInTheDocument();
            expect(screen.getByText('⚠️')).toBeInTheDocument();
        });
    });

    describe('ImportChatProgressBar', () => {
        it('deve exibir o percentual e a contagem de conversas', () => {
            render(
                <ImportChatProgressBar
                    current={12}
                    total={40}
                    percentage={30}
                    error={null}
                    cancelled={false}
                    done={false}
                />
            );
            expect(screen.getByText('Conversa 12 de 40')).toBeInTheDocument();
            expect(screen.getByText('30%')).toBeInTheDocument();
        });
    });

    describe('ImportChatStatusBox', () => {
        it('deve exibir o status textual e o ícone de raio animado durante execução', () => {
            const { rerender } = render(
                <ImportChatStatusBox
                    isRunning={true}
                    error={null}
                    status="Processando mensagens..."
                />
            );
            expect(screen.getByText('Processando mensagens...')).toBeInTheDocument();
            expect(screen.getByText('⚡')).toBeInTheDocument();

            rerender(
                <ImportChatStatusBox
                    isRunning={false}
                    error="Falha na API"
                    status="Finalizado"
                />
            );
            expect(screen.getByText('Falha na API')).toBeInTheDocument();
            expect(screen.queryByText('⚡')).toBeNull();
        });
    });

    describe('ImportChatCounters', () => {
        it('deve exibir os valores de contatos criados, mensagens e tempo decorrido', () => {
            render(
                <ImportChatCounters
                    createdLeads={15}
                    importedMessages={120}
                    done={false}
                    cancelled={false}
                    isRunning={true}
                    timerSec={80}
                />
            );
            expect(screen.getByText('+15')).toBeInTheDocument();
            expect(screen.getByText('+120')).toBeInTheDocument();
            expect(screen.getByText(/Tempo Decorrido/i)).toBeInTheDocument();
            expect(screen.getByText(/01:20/)).toBeInTheDocument();
        });
    });

    describe('ImportChatActions', () => {
        it('deve renderizar botões de cancelar e fechar/concluir e acionar callbacks', () => {
            const onCancel = vi.fn();
            const onRequestCancel = vi.fn();
            const onClose = vi.fn();

            render(
                <ImportChatActions
                    isRunning={true}
                    onCancel={onCancel}
                    onRequestCancel={onRequestCancel}
                    isCancelling={false}
                    onClose={onClose}
                    error={null}
                    done={false}
                />
            );

            const cancelBtn = screen.getByText('🛑 Cancelar Importação');
            fireEvent.click(cancelBtn);
            expect(onRequestCancel).toHaveBeenCalledTimes(1);

            const hideBtn = screen.getByText('Ocultar em Segundo Plano');
            fireEvent.click(hideBtn);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('ImportChatCancelModal', () => {
        it('não deve renderizar nada quando isOpen é false', () => {
            const { container } = render(
                <ImportChatCancelModal
                    isOpen={false}
                    onClose={vi.fn()}
                    onConfirm={vi.fn()}
                    isCancelling={false}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('deve disparar confirmação ao clicar em Sim, Cancelar', async () => {
            const onClose = vi.fn();
            const onConfirm = vi.fn();

            render(
                <ImportChatCancelModal
                    isOpen={true}
                    onClose={onClose}
                    onConfirm={onConfirm}
                    isCancelling={false}
                />
            );

            expect(screen.getByText('Cancelar Importação?')).toBeInTheDocument();
            const confirmBtn = screen.getByText('Sim, Cancelar');
            fireEvent.click(confirmBtn);

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });
    });

    describe('useImportChatProgress hook', () => {
        it('deve controlar o modal de cancelamento', () => {
            const { result } = renderHook(() => useImportChatProgress({ elapsedSeconds: 10, done: true }));

            expect(result.current.showConfirmCancel).toBe(false);

            act(() => {
                result.current.openConfirmCancel();
            });
            expect(result.current.showConfirmCancel).toBe(true);

            act(() => {
                result.current.closeConfirmCancel();
            });
            expect(result.current.showConfirmCancel).toBe(false);
        });
    });
});

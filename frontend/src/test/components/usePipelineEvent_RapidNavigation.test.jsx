import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePipelineEvent } from '../../components/WebhookManager/components/AutomationPipelineModal/hooks/usePipelineEvent';

describe('usePipelineEvent - Prevenção de Flipe e Cache na Navegação Rápida', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('deve usar o cache em memória e não refazer fetch para evento já com processing_steps', async () => {
        const eventWithSteps = {
            id: 201,
            created_at: '2026-09-07T17:00:00.000Z',
            status: 'completed',
            processing_steps: JSON.stringify([{ step: 'Etapa 1', detail: 'Concluído' }])
        };

        const { result, rerender } = renderHook(
            ({ evt }) => usePipelineEvent(evt, 1),
            { initialProps: { evt: eventWithSteps } }
        );

        expect(result.current.initialLoading).toBe(false);
        expect(result.current.isNavigating).toBe(false);
        expect(result.current.event.id).toBe(201);
        expect(global.fetch).not.toHaveBeenCalled();

        // Navega para um segundo evento com steps
        const event2WithSteps = {
            id: 202,
            created_at: '2026-09-07T17:05:00.000Z',
            status: 'completed',
            processing_steps: JSON.stringify([{ step: 'Etapa 2', detail: 'OK' }])
        };

        rerender({ evt: event2WithSteps });

        expect(result.current.event.id).toBe(202);
        expect(result.current.initialLoading).toBe(false);
        expect(result.current.isNavigating).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();

        // Navega de volta para o evento 201: deve recuperar do cache imediatamente sem fetch
        rerender({ evt: eventWithSteps });
        expect(result.current.event.id).toBe(201);
        expect(result.current.initialLoading).toBe(false);
        expect(result.current.isNavigating).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve abortar requisições em voo quando usuário navega rapidamente evitando sobrescrita fora de ordem', async () => {
        const eventA = { id: 301, created_at: '2026-09-07T17:00:00.000Z', status: 'completed' };
        const eventB = { id: 302, created_at: '2026-09-07T17:02:00.000Z', status: 'completed' };

        let abortA = false;
        global.fetch = vi.fn().mockImplementation((url, options) => {
            if (options?.signal) {
                options.signal.addEventListener('abort', () => {
                    if (url.includes('301')) abortA = true;
                });
            }
            if (url.includes('301')) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (abortA) {
                            const err = new Error('The operation was aborted');
                            err.name = 'AbortError';
                            reject(err);
                        } else {
                            resolve({
                                ok: true,
                                json: async () => ({ id: 301, processing_steps: '[Step A]' })
                            });
                        }
                    }, 500);
                });
            }
            if (url.includes('302')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: 302, processing_steps: '[Step B]' })
                });
            }
            return Promise.resolve({ ok: false });
        });

        const { result, rerender } = renderHook(
            ({ evt }) => usePipelineEvent(evt, 1),
            { initialProps: { evt: eventA } }
        );

        expect(result.current.event.id).toBe(301);

        // Usuário clica rápido e muda imediatamente para eventB
        rerender({ evt: eventB });
        expect(result.current.event.id).toBe(302);

        await act(async () => {
            vi.advanceTimersByTime(100);
        });

        expect(result.current.event.id).toBe(302);
        expect(abortA).toBe(true);

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        // Mesmo após o tempo do eventA passar, o resultado do 301 NÃO sobrescreveu o 302
        expect(result.current.event.id).toBe(302);
    });
});

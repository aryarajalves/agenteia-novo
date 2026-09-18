import { describe, it, expect, vi } from 'vitest';
import { dispatchFunnelStepsSequentially } from '../../../components/ChatPlayground/utils/funnelStepDispatcher';

describe('funnelStepDispatcher - Execução sequencial de passos de Funil com Delay', () => {
    const mockSteps = [
        {
            step_number: 1,
            type: 'audio',
            media_url: 'https://cdn.exemplo.com/audio1.mp3',
            transcription: 'Áudio explicativo sobre os detalhes do treinamento.',
            content: '',
            delay_seconds: 3
        },
        {
            step_number: 2,
            type: 'text',
            media_url: '',
            transcription: '',
            content: 'Conseguiu entender como funciona?',
            delay_seconds: 4
        }
    ];

    const baseMetrics = {
        cost: 0,
        tokens: 0,
        model_used: 'question-funnel',
        from_semantic_cache: false,
        from_question_funnel: true
    };

    const baseDebug = {
        funnel_hit: true,
        funnel_id: 10,
        funnel_name: 'Apresentação do Curso'
    };

    it('deve respeitar os delays configurados de cada passo e despachar em sequência', async () => {
        const delaysCalled = [];
        const mockDelayFn = vi.fn((ms) => {
            delaysCalled.push(ms);
            return Promise.resolve();
        });

        const messagesAppended = [];
        const appendMessage = vi.fn((msg) => {
            messagesAppended.push(msg);
        });

        const setLoadingState = vi.fn();

        await dispatchFunnelStepsSequentially({
            funnelSteps: mockSteps,
            rawContent: 'Conteúdo bruto consolidado',
            baseMetrics,
            baseDebug,
            data: { model_used: 'question-funnel' },
            appendMessage,
            setLoadingState,
            delayFn: mockDelayFn
        });

        // 1. Deve ter chamado o delay de 3s (3000ms) para o passo 1 e de 4s (4000ms) para o passo 2
        expect(mockDelayFn).toHaveBeenCalledTimes(2);
        expect(delaysCalled).toEqual([3000, 4000]);

        // 2. Deve ter adicionado duas mensagens individuais em sequência
        expect(appendMessage).toHaveBeenCalledTimes(2);

        // 3. Primeira mensagem (Passo 1 - Áudio)
        const msg1 = messagesAppended[0];
        expect(msg1.funnel_step.type).toBe('audio');
        expect(msg1.funnel_step.delay_seconds).toBe(3);
        expect(msg1.from_question_funnel).toBe(true);
        expect(msg1.metrics).toBeNull(); // Não é a última mensagem

        // 4. Segunda mensagem (Passo 2 - Texto)
        const msg2 = messagesAppended[1];
        expect(msg2.funnel_step.type).toBe('text');
        expect(msg2.funnel_step.delay_seconds).toBe(4);
        expect(msg2.content).toBe('Conseguiu entender como funciona?');
        expect(msg2.from_question_funnel).toBe(true);
        expect(msg2.metrics).toEqual(baseMetrics); // Última mensagem possui as métricas
        expect(msg2.debug).toEqual(baseDebug);

        // 5. Loading deve ter sido mantido ativo
        expect(setLoadingState).toHaveBeenCalledWith(true);
    });

    it('não deve acionar delay se delay_seconds for 0', async () => {
        const stepsWithoutDelay = [
            { step_number: 1, type: 'text', content: 'Mensagem direta', delay_seconds: 0 }
        ];

        const mockDelayFn = vi.fn(() => Promise.resolve());
        const appendMessage = vi.fn();

        await dispatchFunnelStepsSequentially({
            funnelSteps: stepsWithoutDelay,
            rawContent: 'Msg direta',
            baseMetrics,
            baseDebug,
            data: {},
            appendMessage,
            delayFn: mockDelayFn
        });

        expect(mockDelayFn).not.toHaveBeenCalled();
        expect(appendMessage).toHaveBeenCalledTimes(1);
    });

    it('não deve fazer nada se funnelSteps for vazio ou nulo', async () => {
        const mockDelayFn = vi.fn();
        const appendMessage = vi.fn();

        await dispatchFunnelStepsSequentially({
            funnelSteps: [],
            appendMessage,
            delayFn: mockDelayFn
        });

        expect(mockDelayFn).not.toHaveBeenCalled();
        expect(appendMessage).not.toHaveBeenCalled();
    });
});

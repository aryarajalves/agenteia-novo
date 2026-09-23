import { describe, it, expect } from 'vitest';
import { parseDate, formatDuration } from '../../../components/WebhookManager/components/AutomationPipelineModal/utils/helpers/dateAndDuration';
import { getSmartDiagnostic, getStepCategory } from '../../../components/WebhookManager/components/AutomationPipelineModal/utils/helpers/diagnosticsAndCategories';
import { parsePipelineSteps } from '../../../components/WebhookManager/components/AutomationPipelineModal/utils/helpers/stepParser';
import { calculatePipelineMetrics } from '../../../components/WebhookManager/components/AutomationPipelineModal/utils/helpers/metricsCalculator';

describe('PipelineHelpers Modular Utilities', () => {
    describe('dateAndDuration', () => {
        it('deve converter strings de data ISO em objetos Date UTC', () => {
            const date = parseDate('2026-09-02T10:00:00');
            expect(date).toBeInstanceOf(Date);
            expect(isNaN(date.getTime())).toBe(false);

            // Se for inválido, retorna data atual sem estourar exceção
            const fallback = parseDate('invalido');
            expect(fallback).toBeInstanceOf(Date);
        });

        it('deve formatar duração em ms, segundos ou minutos', () => {
            expect(formatDuration(null)).toBeNull();
            expect(formatDuration(450)).toBe('450ms');
            expect(formatDuration(1500)).toBe('1.5s');
            expect(formatDuration(65000)).toBe('1m 5s');
        });
    });

    describe('diagnosticsAndCategories', () => {
        it('deve retornar diagnóstico correto para recusa de conexão', () => {
            const diag = getSmartDiagnostic('connection refused on port 8000');
            expect(diag).not.toBeNull();
            expect(diag.type).toBe('connection_refused');
            expect(diag.severity).toBe('error');
        });

        it('deve retornar diagnóstico correto para falha de autenticação', () => {
            const diag = getSmartDiagnostic('401 unauthorized - invalid api key');
            expect(diag).not.toBeNull();
            expect(diag.type).toBe('auth_error');
        });

        it('deve retornar diagnóstico correto para cota esgotada', () => {
            const diag = getSmartDiagnostic('insufficient_quota rate_limit 429');
            expect(diag).not.toBeNull();
            expect(diag.type).toBe('quota_error');
            expect(diag.severity).toBe('warning');
        });

        it('deve retornar diagnóstico para timeout e 404', () => {
            expect(getSmartDiagnostic('timed out after 60s')?.type).toBe('timeout_error');
            expect(getSmartDiagnostic('404 not found')?.type).toBe('not_found');
            expect(getSmartDiagnostic('tudo certo sem erros')).toBeNull();
        });

        it('deve categorizar passos corretamente por título', () => {
            expect(getStepCategory({ title: '❌ Falha ao enviar' })).toBe('errors');
            expect(getStepCategory({ title: '🤖 Agente gerando resposta' })).toBe('ai');
            expect(getStepCategory({ title: '🏷️ Lead atualizado' })).toBe('tools');
        });
    });

    describe('stepParser and metricsCalculator', () => {
        it('deve parsear steps e calcular métricas agregadas', () => {
            const event = {
                processing_steps: JSON.stringify([
                    { step: '⚡ Cache Semântico HIT', detail: 'Resposta recuperada', metadata: { from_semantic_cache: true, similarity_pct: '99%' } },
                    { step: '🏷️ Salvar Lead', detail: 'Lead salvo com sucesso' }
                ]),
                agent_response: 'Olá, como posso ajudar?',
                status: 'completed'
            };

            const steps = parsePipelineSteps(event);
            expect(steps.length).toBeGreaterThanOrEqual(2);

            const metrics = calculatePipelineMetrics(steps, event);
            expect(metrics.fromSemanticCache).toBe(true);
            expect(metrics.cacheSimilarityPct).toBe('99%');
            expect(metrics.statusInfo.label).toBe('Concluído');
        });
    });
});

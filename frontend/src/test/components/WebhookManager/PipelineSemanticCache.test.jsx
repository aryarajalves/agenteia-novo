import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { parsePipelineSteps, calculatePipelineMetrics } from '../../../components/WebhookManager/components/AutomationPipelineModal/utils/pipelineHelpers';
import PipelineSummaryBar from '../../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineSummaryBar';
import PipelineStepCard from '../../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepCard';

describe('Pipeline Semantic Cache UI & Helpers', () => {
    const mockEventWithCache = {
        id: 100,
        status: 'completed',
        processing_steps: JSON.stringify([
            {
                step: '🚀 Iniciando Pipeline',
                detail: 'A tarefa foi iniciada.',
                timestamp: '2026-08-27T08:52:41Z'
            },
            {
                step: '⚡ Cache Semântico (94.5% Similaridade · Custo Zero)',
                detail: 'Hit de alta precisão.',
                timestamp: '2026-08-27T08:52:41.200Z',
                metadata: {
                    from_semantic_cache: true,
                    similarity_pct: '94.5%',
                    cost: 0.0,
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                }
            },
            {
                step: '⚡ Resposta do Cache Semântico (94.5% Similaridade · Custo Zero)',
                detail: 'Por nada! Se precisar de mais alguma coisa, é só chamar.',
                timestamp: '2026-08-27T08:52:41.300Z',
                metadata: {
                    from_semantic_cache: true,
                    cost: 0.0,
                    usage: { total_tokens: 0 }
                }
            }
        ]),
        agent_response: 'Por nada! Se precisar de mais alguma coisa, é só chamar.'
    };

    it('parsePipelineSteps deve marcar passos do cache com isSemanticCache = true', () => {
        const steps = parsePipelineSteps(mockEventWithCache);
        expect(steps.length).toBe(3);
        expect(steps[1].isSemanticCache).toBe(true);
        expect(steps[1].icon).toBe('⚡');
        expect(steps[2].isSemanticCache).toBe(true);
    });

    it('calculatePipelineMetrics deve extrair métricas de fromSemanticCache e similaridade', () => {
        const steps = parsePipelineSteps(mockEventWithCache);
        const metrics = calculatePipelineMetrics(steps, mockEventWithCache);

        expect(metrics.fromSemanticCache).toBe(true);
        expect(metrics.cacheSimilarityPct).toBe('94.5%');
        expect(metrics.categoryCounts.cache).toBe(2);
        expect(metrics.totalTokens).toBe(0);
        expect(metrics.totalCost).toBe(0);
    });

    it('PipelineSummaryBar deve exibir os badges de Cache Semântico e Custo Zero', () => {
        const steps = parsePipelineSteps(mockEventWithCache);
        const metrics = calculatePipelineMetrics(steps, mockEventWithCache);

        render(<PipelineSummaryBar metrics={metrics} />);

        expect(screen.getByText(/94.5% Cache Semântico/i)).toBeInTheDocument();
        expect(screen.getByText(/Custo Zero/i)).toBeInTheDocument();
    });

    it('PipelineStepCard deve exibir badges de Custo Zero e Similaridade no passo do cache', () => {
        const steps = parsePipelineSteps(mockEventWithCache);
        const cacheStep = steps[1];

        render(<PipelineStepCard step={cacheStep} />);

        expect(screen.getAllByText(/CUSTO ZERO/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/94.5%/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(cacheStep.title)).toBeInTheDocument();
    });

    it('NÃO deve exibir Custo Zero nem badge de Cache Semântico quando a similaridade for insuficiente (Cache Miss com custo > 0)', () => {
        const mockEventMiss = {
            id: 414,
            status: 'completed',
            processing_steps: JSON.stringify([
                {
                    step: '🔍 Verificação de Cache Semântico (70.7% Similaridade)',
                    detail: 'Nenhuma resposta cadastrada atingiu a similaridade mínima necessária.',
                    timestamp: '2026-09-02T12:55:26.988Z',
                    metadata: {
                        from_semantic_cache: false,
                        max_similarity: 0.707,
                        similarity_pct: '70.7%',
                        threshold: 0.85
                    }
                },
                {
                    step: 'Resposta gerada pelo agente',
                    detail: 'Resposta completa da IA.',
                    timestamp: '2026-09-02T12:56:00.000Z',
                    metadata: {
                        cost: 0.1977,
                        usage: { prompt_tokens: 24000, completion_tokens: 2007, total_tokens: 26007 }
                    }
                }
            ]),
            agent_response: 'Resposta completa da IA.'
        };

        const steps = parsePipelineSteps(mockEventMiss);
        const metrics = calculatePipelineMetrics(steps, mockEventMiss);

        // A verificação deve garantir que NÃO foi considerado cache hit
        expect(metrics.fromSemanticCache).toBe(false);
        expect(metrics.totalCost).toBeCloseTo(0.1977, 4);
        expect(metrics.totalTokens).toBe(26007);

        render(<PipelineSummaryBar metrics={metrics} />);

        // O custo total deve ser exibido com o valor pago (R$ 0.1977)
        expect(screen.getByText(/0.1977/i)).toBeInTheDocument();

        // O badge "Custo Zero" JAMAIS pode aparecer quando houve custo real
        expect(screen.queryByText(/Custo Zero/i)).toBeNull();

        // O badge "70.7% Cache Semântico" JAMAIS pode aparecer nos tokens
        expect(screen.queryByText(/70.7% Cache Semântico/i)).toBeNull();
    });

    it('deve renderizar as perguntas analisadas e suas respectivas similaridades no card de passo do cache', () => {
        const mockStepWithDiagnostics = {
            id: 'step-diag',
            icon: '🔍',
            title: 'Verificação de Cache Semântico (70.7% Similaridade)',
            content: 'Nenhuma resposta cadastrada atingiu a similaridade mínima necessária.',
            category: 'cache',
            metadata: {
                from_semantic_cache: false,
                similarity_pct: '70.7%',
                threshold: 0.85,
                queries_evaluated: [
                    {
                        sub_query: 'Como funciona o curso?',
                        matched_query: 'como funciona o curso?',
                        similarity_pct: '96.2%',
                        threshold_pct: '85.0%',
                        approved: true
                    },
                    {
                        sub_query: 'Quanto custa a mensalidade?',
                        matched_query: 'qual o valor da formação?',
                        similarity_pct: '70.7%',
                        threshold_pct: '85.0%',
                        approved: false
                    }
                ]
            }
        };

        render(<PipelineStepCard step={mockStepWithDiagnostics} isAllCollapsed={false} />);

        // Deve exibir as perguntas que o usuário fez
        expect(screen.getAllByText(/Como funciona o curso\?/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Quanto custa a mensalidade\?/i)).toBeInTheDocument();

        // Deve exibir o quanto teve de similaridade para cada pergunta
        expect(screen.getByText(/Aprovada \(96.2%\)/i)).toBeInTheDocument();
        expect(screen.getByText(/70.7% < 85.0%/i)).toBeInTheDocument();

        // Deve exibir a pergunta mais próxima encontrada no cache
        expect(screen.getByText(/qual o valor da formação\?/i)).toBeInTheDocument();

        // Não pode exibir Custo Zero neste passo de miss
        expect(screen.queryByText(/CUSTO ZERO/i)).toBeNull();
        expect(screen.getByText(/SIMILARIDADE INSUFICIENTE/i)).toBeInTheDocument();
    });
});


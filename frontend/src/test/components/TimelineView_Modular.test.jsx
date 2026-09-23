import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import buildTimelineSteps from '../../components/ChatPlayground/components/TimelineViewModules/utils/timelineBuilder';
import TimelineStepItem from '../../components/ChatPlayground/components/TimelineViewModules/components/TimelineStepItem';

describe('TimelineViewModules - Subcomponentes e Builder Isolados', () => {
    describe('buildTimelineSteps Builder', () => {
        it('deve retornar array vazio se debug for nulo ou indefinido', () => {
            expect(buildTimelineSteps(null)).toEqual([]);
            expect(buildTimelineSteps(undefined)).toEqual([]);
        });

        it('deve construir passos de Cache Semântico com diferentes status', () => {
            // Hit Direto
            const stepsDirect = buildTimelineSteps({
                semantic_cache: {
                    status: 'hit_direct',
                    similarity_pct: '95%',
                    matched_query: 'qual o preco?',
                    matched_queries: ['qual o preco?', 'quanto custa?']
                }
            });
            const cacheStepDirect = stepsDirect.find(s => s.isSemanticCache);
            expect(cacheStepDirect).toBeDefined();
            expect(cacheStepDirect.badgeLabel).toBe('⚡ Custo Zero');
            expect(cacheStepDirect.matchedQueries).toHaveLength(2);

            // Hit Qualificação
            const stepsQual = buildTimelineSteps({
                semantic_cache: {
                    status: 'hit_qualification',
                    similarity_pct: '89%',
                    matched_query: 'como funciona?',
                    matched_queries: ['como funciona?']
                }
            });
            const cacheStepQual = stepsQual.find(s => s.isSemanticCache);
            expect(cacheStepQual.badgeLabel).toBe('⚡ Cache + Funil Ativo');

            // Miss
            const stepsMiss = buildTimelineSteps({
                semantic_cache: {
                    status: 'miss',
                    closest_candidate: 'horario',
                    closest_similarity_pct: '72%',
                    threshold_pct: '85%'
                }
            });
            const cacheStepMiss = stepsMiss.find(s => s.isSemanticCache);
            expect(cacheStepMiss.badgeLabel).toBe('Sem Match');
            expect(cacheStepMiss.simLabel).toBe('72%');
        });

        it('deve construir passos de RAG, Ferramentas, Guardrails e Violações', () => {
            const complexDebug = {
                context_variables: { cliente_nome: 'João', saldo: 150 },
                router_model: 'gemini-1.5-flash',
                rag_items: [{ id: 1, content: 'Trecho RAG' }],
                internet_searched: true,
                searched_query: 'noticias recentes',
                tool_calls: [{ name: 'consultar_cpf', output: 'CPF válido e ativo' }],
                guardrails_active: true,
                violations: true
            };

            const steps = buildTimelineSteps(complexDebug);

            expect(steps.some(s => s.isContextVars)).toBe(true);
            expect(steps.some(s => s.title.includes('Cost Router'))).toBe(true);
            expect(steps.some(s => s.title.includes('RAG Recuperou Contexto'))).toBe(true);
            expect(steps.some(s => s.title.includes('Pesquisa Web'))).toBe(true);
            expect(steps.some(s => s.title.includes('Ferramenta Executada: consultar_cpf'))).toBe(true);
            expect(steps.some(s => s.title.includes('Políticas Ativas'))).toBe(true);
            expect(steps.some(s => s.isViolation)).toBe(true);
        });
    });

    describe('TimelineStepItem Component', () => {
        it('deve aplicar classe de violação e estilo rosa para violações', () => {
            const violationStep = {
                icon: '🚫',
                title: 'Filtro de Output',
                desc: 'Conteúdo bloqueado.',
                isViolation: true
            };

            const { container } = render(<TimelineStepItem step={violationStep} />);
            expect(container.querySelector('.timeline-step.violation')).toBeInTheDocument();
            expect(screen.getByText('Filtro de Output')).toHaveStyle({ color: 'rgb(244, 63, 94)' });
        });

        it('deve renderizar variáveis de contexto com tags formatadas', () => {
            const contextStep = {
                icon: '📦',
                title: 'Variáveis de Contexto recebidas',
                isContextVars: true,
                vars: { canal: 'whatsapp', tentativas: 2 }
            };

            render(<TimelineStepItem step={contextStep} />);
            expect(screen.getByText('canal')).toBeInTheDocument();
            expect(screen.getByText('whatsapp')).toBeInTheDocument();
            expect(screen.getByText('tentativas')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });
    });
});

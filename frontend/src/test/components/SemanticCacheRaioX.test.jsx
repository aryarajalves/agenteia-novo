import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TimelineView from '../../components/ChatPlayground/components/TimelineView';
import DebugPanel from '../../components/ChatPlayground/components/MessageBubbleModules/DebugPanel';

describe('TimelineView - Cache Semântico no Raio-X', () => {
    it('deve renderizar etapa de Hit no Cache Semântico com Funil de Qualificação Ativo', () => {
        const debug = {
            semantic_cache: {
                consulted: true,
                enabled: true,
                status: 'hit_qualification',
                status_label: 'Hit + Funil de Qualificação Ativo',
                similarity_pct: '93.1%',
                threshold_pct: '85.0%',
                matched_id: 12,
                matched_query: 'como funciona?',
                funnel_active: true
            }
        };

        render(<TimelineView debug={debug} />);

        expect(screen.getByText('Cache Semântico + Funil de Qualificação Ativo')).toBeInTheDocument();
        expect(screen.getByText('⚡ Cache + Funil Ativo')).toBeInTheDocument();
        expect(screen.getByText(/🎯 93.1%/)).toBeInTheDocument();
        expect(screen.getAllByText(/como funciona\?/).length).toBeGreaterThanOrEqual(1);
    });

    it('deve renderizar etapa de Hit Direto (Custo Zero)', () => {
        const debug = {
            semantic_cache: {
                consulted: true,
                enabled: true,
                status: 'hit_direct',
                similarity_pct: '95.0%',
                matched_query: 'Quanto custa o curso?'
            }
        };

        render(<TimelineView debug={debug} />);

        expect(screen.getByText('Cache Semântico: Resposta Homologada (Custo Zero)')).toBeInTheDocument();
        expect(screen.getByText('⚡ Custo Zero')).toBeInTheDocument();
        expect(screen.getAllByText(/Quanto custa o curso\?/).length).toBeGreaterThanOrEqual(1);
    });

    it('deve renderizar etapa de Consulta Sem Match (Miss)', () => {
        const debug = {
            semantic_cache: {
                consulted: true,
                enabled: true,
                status: 'miss',
                threshold_pct: '85.0%',
                closest_candidate: 'qual o valor do curso?',
                closest_similarity_pct: '59.4%'
            }
        };

        render(<TimelineView debug={debug} />);

        expect(screen.getByText('Cache Semântico Consultado (Sem Match)')).toBeInTheDocument();
        expect(screen.getByText('Sem Match')).toBeInTheDocument();
        expect(screen.getByText(/qual o valor do curso\?/)).toBeInTheDocument();
    });

    it('deve renderizar lista de perguntas respondidas no card do Cache Semântico na Timeline', () => {
        const debug = {
            semantic_cache: {
                status: 'hit_direct',
                similarity_pct: '95.0%',
                matched_query: '2 perguntas respondidas via cache',
                matched_queries: [
                    'Como acessar as aulas?',
                    'Onde fica o suporte?'
                ]
            }
        };

        render(<TimelineView debug={debug} />);

        expect(screen.getByText('Perguntas respondidas pelo Cache:')).toBeInTheDocument();
        expect(screen.getByText(/"Como acessar as aulas\?"/)).toBeInTheDocument();
        expect(screen.getByText(/"Onde fica o suporte\?"/)).toBeInTheDocument();
    });

    it('deve renderizar a pergunta enviada para o RAG no card do RAG na Timeline', () => {
        const debug = {
            rag_queries: ['Como funciona o reembolso?'],
            rag_items: [
                {
                    category: 'Geral',
                    question: 'Como funciona o reembolso?',
                    answer: 'O reembolso pode ser solicitado em até 7 dias.'
                }
            ]
        };

        render(<TimelineView debug={debug} />);

        expect(screen.getByText('RAG Recuperou Contexto')).toBeInTheDocument();
        expect(screen.getByText(/Consulta: "Como funciona o reembolso\?"/)).toBeInTheDocument();
    });
});

describe('DebugPanel - Detalhes do Cache Semântico', () => {
    it('deve exibir card de Cache Semântico + Funil de Qualificação com explicação e similaridade', () => {
        const msg = {
            role: 'assistant',
            content: 'O curso é 100% online...',
            debug: {
                semantic_cache: {
                    consulted: true,
                    status: 'hit_qualification',
                    similarity_pct: '93.1%',
                    threshold_pct: '85.0%',
                    matched_id: 12,
                    matched_query: 'como funciona?',
                    funnel_active: true
                }
            }
        };

        render(<DebugPanel msg={msg} showDebug={true} />);

        expect(screen.getByText('⚡ Resposta Oficial do Cache + Funil de Qualificação Ativo')).toBeInTheDocument();
        expect(screen.getByText(/93.1% de Similaridade/)).toBeInTheDocument();
        expect(screen.getAllByText(/como funciona\?/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Funil de Qualificação/).length).toBeGreaterThanOrEqual(1);
    });

    it('deve exibir card de Consulta Sem Match informando candidato mais próximo', () => {
        const msg = {
            role: 'assistant',
            content: 'Resposta do modelo...',
            debug: {
                semantic_cache: {
                    consulted: true,
                    status: 'miss',
                    threshold_pct: '85.0%',
                    closest_candidate: 'qual o valor?',
                    closest_similarity_pct: '45.0%'
                }
            }
        };

        render(<DebugPanel msg={msg} showDebug={true} />);

        expect(screen.getByText('⚡ Cache Semântico Consultado (Sem Match)')).toBeInTheDocument();
        expect(screen.getByText(/45.0% Maior Similaridade/)).toBeInTheDocument();
        expect(screen.getAllByText(/qual o valor\?/).length).toBeGreaterThanOrEqual(1);
    });

    it('deve listar nominalmente as perguntas respondidas pelo Cache Semântico', () => {
        const msg = {
            role: 'assistant',
            content: 'Resposta do modelo...',
            debug: {
                semantic_cache: {
                    status: 'partial_hit',
                    similarity_pct: '88.0%',
                    matched_query: '2 perguntas respondidas via cache',
                    matched_queries: [
                        'Como funciona o curso?',
                        'O curso tem certificado?'
                    ]
                }
            }
        };

        render(<DebugPanel msg={msg} showDebug={true} />);

        expect(screen.getByText('🎯 Perguntas Respondidas pelo Cache Semântico:')).toBeInTheDocument();
        expect(screen.getAllByText(/"Como funciona o curso\?"/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/"O curso tem certificado\?"/).length).toBeGreaterThanOrEqual(1);
    });

    it('deve exibir a pergunta enviada para o RAG no bloco de Fontes Recuperadas', () => {
        const msg = {
            role: 'assistant',
            content: 'Resposta com RAG...',
            debug: {
                rag_queries: ['Qual a carga horária do curso?'],
                rag_items: [
                    {
                        category: 'Geral',
                        question: 'Qual a carga horária do curso?',
                        answer: 'A carga horária total é de 60 horas com certificado.',
                        relevance_score: 0.92
                    }
                ]
            }
        };

        render(<DebugPanel msg={msg} showDebug={true} />);

        expect(screen.getByText(/Pergunta enviada para o RAG:/)).toBeInTheDocument();
        expect(screen.getAllByText(/"Qual a carga horária do curso\?"/).length).toBeGreaterThanOrEqual(1);
    });
});


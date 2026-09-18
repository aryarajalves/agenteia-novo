import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TabQuestionFunnels from '../../components/ConfigPanel/components/TabQuestionFunnels';

// Mock ConfigContext
vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => ({
        id: 10,
        isNew: false
    })
}));

// Mock api client
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

import { api } from '../../api/client';

describe('TabQuestionFunnels Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza o cabeçalho e botão de novo funil por dúvida', async () => {
        api.get.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        render(<TabQuestionFunnels />);

        expect(screen.getByText(/Funis de Conversão por Dúvida/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /\+? ?Novo Funil por Dúvida/i })).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText(/Nenhum funil por dúvida cadastrado ainda/i)).toBeInTheDocument();
        });
    });

    it('lista funis existentes com perguntas e passos', async () => {
        api.get.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    id: 1,
                    agent_id: 10,
                    name: 'Como Funciona o Curso',
                    trigger_question: 'como funciona o curso de vcs?',
                    trigger_variations: ['me explica as aulas'],
                    similarity_threshold: 0.85,
                    frequency_mode: 'once_per_lead',
                    is_active: true,
                    steps: [
                        { step_number: 1, type: 'audio', media_url: 'https://s3.com/a.mp3', delay_seconds: 0 },
                        { step_number: 2, type: 'text', content: 'Ficou com dúvidas?', delay_seconds: 3 }
                    ],
                    total_executions: 4
                }
            ]
        });

        render(<TabQuestionFunnels />);

        await waitFor(() => {
            expect(screen.getByText('Como Funciona o Curso')).toBeInTheDocument();
            expect(screen.getByText('"como funciona o curso de vcs?"')).toBeInTheDocument();
            expect(screen.getByText(/4 disparos/i)).toBeInTheDocument();
            expect(screen.getByText(/Sensibilidade/i)).toBeInTheDocument();
        });
    });

    it('abre o modal de criação ao clicar no botão de novo funil', async () => {
        api.get.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        render(<TabQuestionFunnels />);

        const btn = screen.getByRole('button', { name: /\+? ?Novo Funil por Dúvida/i });
        fireEvent.click(btn);

        expect(screen.getByRole('heading', { name: /Novo Funil por Dúvida/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/como funciona o curso de vcs\?/i)).toBeInTheDocument();
    });

    it('suporta resposta paginada e exibe o resumo de 20 por página', async () => {
        api.get.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [
                    {
                        id: 1,
                        agent_id: 10,
                        name: 'Funil Paginado 1',
                        trigger_question: 'pergunta 1',
                        trigger_variations: [],
                        similarity_threshold: 0.82,
                        frequency_mode: 'once_per_lead',
                        is_active: true,
                        steps: [],
                        total_executions: 0
                    }
                ],
                total: 25,
                page: 1,
                page_size: 20,
                total_pages: 2,
                active_count: 1
            })
        });

        render(<TabQuestionFunnels />);

        await waitFor(() => {
            expect(screen.getByText('Funil Paginado 1')).toBeInTheDocument();
            expect(screen.getByText(/1–20/)).toBeInTheDocument();
            expect(screen.getByText('25')).toBeInTheDocument();
            expect(screen.getByText(/\(20 por página\)/)).toBeInTheDocument();
        });
    });
});


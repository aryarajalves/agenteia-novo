import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LogsViewer from '../../components/LogsViewer';

// Mock do módulo de API
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import { api } from '../../api/client';

describe('Componente LogsViewer - Modularizado', () => {
    const mockContainers = [
        { name: 'backend', image: 'backend:latest', status: 'running' },
        { name: 'worker', image: 'worker:latest', status: 'running' },
        { name: 'redis', image: 'redis:7', status: 'running' },
    ];

    const mockDays = {
        days: [
            { date: '2026-08-19', date_display: '19/08/2026 (Ter)', count: 4520 },
            { date: '2026-08-18', date_display: '18/08/2026 (Seg)', count: 3100 },
        ],
        total_count: 7620
    };

    const mockLogs = {
        logs: [
            {
                id: 'log-1',
                container: 'backend',
                timestamp_display: '2026-08-19 14:30:00',
                logger: 'services.webhook',
                level: 'INFO',
                message: 'Webhook recebido com sucesso',
                raw: '2026-08-19 14:30:00 - services.webhook - INFO - Webhook recebido com sucesso',
                tags: []
            },
            {
                id: 'log-2',
                container: 'worker',
                timestamp_display: '2026-08-19 14:30:01',
                logger: 'services.celery',
                level: 'ERROR',
                message: 'Falha ao processar tarefa',
                raw: '2026-08-19 14:30:01 - services.celery - ERROR - Falha ao processar tarefa',
                tags: []
            },
            {
                id: 'log-3',
                container: 'backend',
                timestamp_display: '2026-08-19 14:30:02',
                logger: 'core.logger',
                level: 'WARNING',
                message: 'Rate limit atingido',
                raw: '2026-08-19 14:30:02 - core.logger - WARNING - Rate limit atingido',
                tags: []
            }
        ],
        quick_filters: [],
        errors: []
    };

    beforeEach(() => {
        vi.clearAllMocks();

        api.get.mockImplementation(async (endpoint) => {
            if (endpoint === '/logs/containers') {
                return { ok: true, json: async () => mockContainers };
            }
            if (endpoint === '/logs/days') {
                return { ok: true, json: async () => mockDays };
            }
            // Qualquer outra rota /logs (ex: /logs?tail=2000) retorna os logs
            return { ok: true, json: async () => mockLogs };
        });
    });

    // Helper: encontra e clica o botão azul principal "🔄 Carregar Logs"
    const clickLoadBtn = async () => {
        const allButtons = screen.getAllByRole('button');
        const loadBtn = allButtons.find(btn => btn.textContent.includes('Carregar Logs'));
        await act(async () => {
            fireEvent.click(loadBtn);
        });
    };

    it('deve renderizar o cabeçalho e os containers disponíveis', async () => {
        render(<LogsViewer />);

        expect(screen.getByText('Visualizador de Logs')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getAllByText(/backend/).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/worker/).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/redis/).length).toBeGreaterThan(0);
        });
    });

    it('deve exibir o total de linhas nos containers (30 dias)', async () => {
        render(<LogsViewer />);

        await waitFor(() => {
            expect(screen.getByText(/7\.620 linhas nos containers/)).toBeInTheDocument();
        });
    });

    it('deve carregar e exibir os logs ao clicar em Carregar Logs', async () => {
        render(<LogsViewer />);

        await waitFor(() => {
            expect(screen.getAllByRole('button').find(b => b.textContent.includes('Carregar Logs'))).toBeTruthy();
        });

        await clickLoadBtn();

        // O texto da mensagem é renderizado em um span que contém sub-spans:
        // <span><span>services.webhook</span> — Webhook recebido com sucesso</span>
        // Procuramos no textContent de elementos com a classe correta
        await waitFor(() => {
            const allText = document.body.textContent;
            expect(allText).toContain('Webhook recebido com sucesso');
            expect(allText).toContain('Falha ao processar tarefa');
            expect(allText).toContain('Rate limit atingido');
        });
    });

    it('deve exibir os chips de nível com contadores corretos após carregar', async () => {
        render(<LogsViewer />);

        await waitFor(() => {
            expect(screen.getAllByRole('button').find(b => b.textContent.includes('Carregar Logs'))).toBeTruthy();
        });

        await clickLoadBtn();

        await waitFor(() => {
            expect(screen.getByText(/INFO \(1\)/)).toBeInTheDocument();
            expect(screen.getByText(/ERROR \(1\)/)).toBeInTheDocument();
            expect(screen.getByText(/WARNING \(1\)/)).toBeInTheDocument();
        });
    });

    it('deve filtrar logs por nível ao clicar no chip ERROR', async () => {
        render(<LogsViewer />);

        await waitFor(() => {
            expect(screen.getAllByRole('button').find(b => b.textContent.includes('Carregar Logs'))).toBeTruthy();
        });

        await clickLoadBtn();

        await waitFor(() => {
            expect(screen.getByText(/ERROR \(1\)/)).toBeInTheDocument();
        });

        // Clicar no chip ERROR para filtrar apenas erros
        await act(async () => {
            fireEvent.click(screen.getByText(/ERROR \(1\)/));
        });

        // Após filtrar, verificamos que apenas a mensagem de ERROR aparece
        await waitFor(() => {
            const bodyText = document.body.textContent;
            expect(bodyText).toContain('Falha ao processar tarefa');
            expect(bodyText).not.toContain('Webhook recebido com sucesso');
            expect(bodyText).not.toContain('Rate limit atingido');
        });
    });

    it('deve abrir e fechar o modal de colar manualmente', async () => {
        render(<LogsViewer />);

        await waitFor(() => {
            expect(screen.getByText('📋 Colar manualmente')).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByText('📋 Colar manualmente'));
        });

        await waitFor(() => {
            expect(screen.getByText('Colar Logs Manualmente')).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByText('Cancelar'));
        });

        await waitFor(() => {
            expect(screen.queryByText('Colar Logs Manualmente')).not.toBeInTheDocument();
        });
    });
});

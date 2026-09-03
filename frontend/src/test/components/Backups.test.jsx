import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Backups from '../../components/Backups';

// Mock do módulo de API
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

import { api } from '../../api/client';

describe('Componente Backups - Modularizado', () => {
    const mockConfig = {
        enabled: true,
        frequency_type: 'hours',
        interval_value: 12,
        retention_count: 20,
        backup_folder: 'backups/prod',
        last_run: '2026-08-19T10:00:00.000Z',
        next_run: '2026-08-19T22:00:00.000Z',
        last_success_filename: 'backup_ultimo_sucesso.dump.gz',
        last_success_created_at: '2026-08-19T10:00:00.000Z'
    };

    const mockHistory = [
        {
            id: 1,
            filename: 'backup_item_1.dump.gz',
            created_at: '2026-08-19T10:00:00.000Z',
            file_size_bytes: 10485760, // 10 MB
            status: 'success',
            is_pinned: false,
            error_message: null
        },
        {
            id: 2,
            filename: 'backup_item_2.dump.gz',
            created_at: '2026-08-18T10:00:00.000Z',
            file_size_bytes: 5242880, // 5 MB
            status: 'failure',
            is_pinned: true,
            error_message: 'S3 Connection Timeout'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        api.get.mockImplementation(async (endpoint) => {
            if (endpoint.includes('/backups/config')) {
                return {
                    ok: true,
                    json: async () => mockConfig,
                };
            }
            if (endpoint.includes('/backups/history')) {
                return {
                    ok: true,
                    json: async () => mockHistory,
                };
            }
            return { ok: false };
        });
    });

    it('deve carregar e renderizar os cards de métricas e histórico de backups', async () => {
        render(<Backups />);

        expect(screen.getByText('Gerenciamento de Backups')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('backup_ultimo_sucesso.dump.gz')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('backup_item_1.dump.gz')).toBeInTheDocument();
        });

        expect(screen.getByText('backup_item_2.dump.gz')).toBeInTheDocument();
        expect(screen.getAllByText(/A cada 12 hora\(s\)/i).length).toBeGreaterThan(0);
        expect(screen.getByText('FIXADO')).toBeInTheDocument();
        expect(screen.getByText(/Erro: S3 Connection Timeout/i)).toBeInTheDocument();
    });

    it('deve permitir disparar um backup manual', async () => {
        api.post.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'started' }) });

        render(<Backups />);

        await waitFor(() => {
            expect(screen.getByText('Fazer Backup Agora')).toBeInTheDocument();
        });

        const manualBtn = screen.getByText('Fazer Backup Agora');
        fireEvent.click(manualBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/backups/run');
        });
    });

    it('deve permitir salvar as alterações de agendamento automático', async () => {
        api.put.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

        render(<Backups />);

        await waitFor(() => {
            expect(screen.getByText(/Salvar Configuração/i)).toBeInTheDocument();
        });

        const saveBtn = screen.getByText(/Salvar Configuração/i);
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/backups/config', expect.objectContaining({
                enabled: true,
                frequency_type: 'hours',
                interval_value: 12,
                retention_count: 20,
                backup_folder: 'backups/prod'
            }));
        });
    });

    it('deve alternar a fixação (pin) de um backup', async () => {
        api.post.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

        render(<Backups />);

        await waitFor(() => {
            expect(screen.getByText('backup_item_1.dump.gz')).toBeInTheDocument();
        });

        const pinBtns = screen.getAllByTitle(/Fixar backup|Liberar para auto-limpeza/i);
        fireEvent.click(pinBtns[0]);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/backups/history/1/pin');
        });
    });

    it('deve abrir modal de confirmação ao clicar em excluir backup', async () => {
        api.delete.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

        render(<Backups />);

        await waitFor(() => {
            expect(screen.getByText('backup_item_1.dump.gz')).toBeInTheDocument();
        });

        const deleteBtns = screen.getAllByTitle('Excluir Backup');
        fireEvent.click(deleteBtns[0]);

        await waitFor(() => {
            expect(screen.getByText('Excluir Backup')).toBeInTheDocument();
            expect(screen.getByText(/Tem certeza que deseja excluir permanentemente o backup/i)).toBeInTheDocument();
        });

        const confirmBtn = screen.getByText('Excluir permanentemente');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith('/backups/history/1');
        });
    });

    it('deve abrir modal de aviso crítico ao clicar em restaurar backup', async () => {
        api.post.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

        render(<Backups />);

        await waitFor(() => {
            expect(screen.getByText('backup_item_1.dump.gz')).toBeInTheDocument();
        });

        const restoreBtn = screen.getByTitle('Restaurar este Backup (Substituir Banco)');
        fireEvent.click(restoreBtn);

        await waitFor(() => {
            expect(screen.getByText('Restaurar Banco de Dados')).toBeInTheDocument();
            expect(screen.getByText(/AVISO CRÍTICO/i)).toBeInTheDocument();
        });

        const confirmRestoreBtn = screen.getByText('Sim, Restaurar Agora');
        fireEvent.click(confirmRestoreBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/backups/history/1/restore');
        });
    });
});

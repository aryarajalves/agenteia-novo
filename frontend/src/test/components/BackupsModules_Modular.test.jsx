import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    formatBytes,
    formatDateTime,
    showToast,
    useBackupBatchOperations,
    useBackupItemActions
} from '../../components/BackupsModules';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn()
    }
}));

describe('BackupsModules Modular Utilities and Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('backupFormatters', () => {
        it('deve formatar bytes corretamente em KB, MB, GB', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1073741824)).toBe('1 GB');
        });

        it('deve formatar data ou retornar Nunca se for nulo', () => {
            expect(formatDateTime(null)).toBe('Nunca');
            expect(formatDateTime('')).toBe('Nunca');
            const formatted = formatDateTime('2026-08-19T10:00:00.000Z');
            expect(formatted).toContain('2026');
        });

        it('deve disparar evento app:toast customizado', () => {
            const spy = vi.spyOn(window, 'dispatchEvent');
            showToast('Teste de backup', 'success');
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'app:toast'
            }));
        });
    });

    describe('useBackupBatchOperations hook', () => {
        const mockPaginatedHistory = [
            { id: 1, is_pinned: false, status: 'success' },
            { id: 2, is_pinned: true, status: 'success' },
            { id: 3, is_pinned: false, status: 'running' },
            { id: 4, is_pinned: false, status: 'success' }
        ];

        it('deve identificar corretamente os itens deletáveis e alternar seleção', () => {
            const fetchHistory = vi.fn();
            const { result } = renderHook(() => useBackupBatchOperations({
                paginatedHistory: mockPaginatedHistory,
                fetchHistory
            }));

            // Apenas id: 1 e id: 4 são deletáveis (não fixados e não em execução)
            expect(result.current.deletableHistoryItems.map(i => i.id)).toEqual([1, 4]);

            // Selecionar item individual
            act(() => {
                result.current.handleSelectToggle(1);
            });
            expect(result.current.selectedIds).toEqual([1]);
            expect(result.current.isAllSelected).toBe(false);

            // Selecionar todos os deletáveis da página
            act(() => {
                result.current.handleSelectAllToggle();
            });
            expect(result.current.selectedIds).toEqual([1, 4]);
            expect(result.current.isAllSelected).toBe(true);

            // Desmarcar todos ao chamar novamente
            act(() => {
                result.current.handleSelectAllToggle();
            });
            expect(result.current.selectedIds).toEqual([]);
        });
    });

    describe('useBackupItemActions hook', () => {
        it('deve abrir e fechar modais de delete e restore', () => {
            const { result } = renderHook(() => useBackupItemActions({
                history: [],
                setHistory: vi.fn(),
                setSelectedIds: vi.fn(),
                fetchHistory: vi.fn(),
                fetchConfig: vi.fn()
            }));

            act(() => {
                result.current.handleDeleteClick({ id: 10, filename: 'backup_10.dump.gz' });
            });
            expect(result.current.confirmDelete.isOpen).toBe(true);
            expect(result.current.confirmDelete.id).toBe(10);

            act(() => {
                result.current.handleRestoreClick({ id: 20, filename: 'backup_20.dump.gz' });
            });
            expect(result.current.confirmRestore.isOpen).toBe(true);
            expect(result.current.confirmRestore.id).toBe(20);
        });
    });
});

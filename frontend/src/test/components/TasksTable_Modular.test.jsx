import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { formatDate, getStatusBadge } from '../../components/TranscriptionHistory/components/TasksTableModules/utils/tasksFormatters';
import TasksTableEmptyState from '../../components/TranscriptionHistory/components/TasksTableModules/components/TasksTableEmptyState';
import ActiveUploadRow from '../../components/TranscriptionHistory/components/TasksTableModules/components/ActiveUploadRow';
import TaskRow from '../../components/TranscriptionHistory/components/TasksTableModules/components/TaskRow';
import TasksTablePagination from '../../components/TranscriptionHistory/components/TasksTableModules/components/TasksTablePagination';

describe('TasksTableModules - Subcomponentes e Formatadores', () => {
    describe('tasksFormatters', () => {
        it('deve formatar datas corretamente ou retornar fallback', () => {
            expect(formatDate(null)).toBe('-');
            expect(formatDate('')).toBe('-');
            const formatted = formatDate('2026-05-10T14:30:00Z');
            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}/);
        });

        it('deve renderizar badges de status para PENDING, PROCESSING, SUCCESS e FAILURE', () => {
            const { rerender } = render(<div>{getStatusBadge({ status: 'PENDING' })}</div>);
            expect(screen.getByText('⏳ Na Fila')).toBeInTheDocument();

            rerender(<div>{getStatusBadge({ status: 'PROCESSING' })}</div>);
            expect(screen.getByText('⚙️ Processando')).toBeInTheDocument();

            rerender(<div>{getStatusBadge({ status: 'SUCCESS' })}</div>);
            expect(screen.getByText('✅ Concluído')).toBeInTheDocument();

            rerender(<div>{getStatusBadge({ status: 'FAILURE', error_message: 'Falha no áudio' })}</div>);
            const failureBadge = screen.getByText('❌ Erro');
            expect(failureBadge).toBeInTheDocument();
            expect(failureBadge).toHaveAttribute('title', 'Falha no áudio');
        });
    });

    describe('TasksTableEmptyState Component', () => {
        it('deve renderizar o card informativo de histórico vazio', () => {
            render(<TasksTableEmptyState />);
            expect(screen.getByText('Histórico Vazio')).toBeInTheDocument();
            expect(screen.getByText(/Você ainda não realizou nenhuma transcrição manual/i)).toBeInTheDocument();
        });
    });

    describe('ActiveUploadRow Component', () => {
        it('deve renderizar barra de progresso para upload em andamento', () => {
            const upload = {
                id: 'up-1',
                filename: 'audio_reuniao.mp3',
                status: 'uploading',
                progress: 65,
                created_at: '2026-05-10T14:00:00Z'
            };

            render(
                <table>
                    <tbody>
                        <ActiveUploadRow upload={upload} formatDate={formatDate} />
                    </tbody>
                </table>
            );

            expect(screen.getByText('audio_reuniao.mp3')).toBeInTheDocument();
            expect(screen.getByText(/Enviando 65%/i)).toBeInTheDocument();
        });
    });

    describe('TaskRow Component', () => {
        const mockTaskSuccess = {
            id: 'task-100',
            filename: 'conversa_cliente.wav',
            status: 'SUCCESS',
            cost_usd: 0.15,
            created_at: '2026-05-10T15:00:00Z'
        };

        it('deve renderizar dados da tarefa e acionar botões de ação', () => {
            const onView = vi.fn();
            const onTrain = vi.fn();
            const onDelete = vi.fn();

            render(
                <table>
                    <tbody>
                        <TaskRow
                            task={mockTaskSuccess}
                            isSelected={false}
                            onToggleSelect={vi.fn()}
                            isEditing={false}
                            editValue=""
                            setEditValue={vi.fn()}
                            onStartEditing={vi.fn()}
                            onSaveRename={vi.fn()}
                            onCancelEditing={vi.fn()}
                            formatDate={formatDate}
                            getStatusBadge={getStatusBadge}
                            onViewTranscription={onView}
                            onTrainAI={onTrain}
                            onRetry={vi.fn()}
                            onDeleteTask={onDelete}
                        />
                    </tbody>
                </table>
            );

            expect(screen.getByText('conversa_cliente.wav')).toBeInTheDocument();
            expect(screen.getByText('$0.15')).toBeInTheDocument();

            const viewBtn = screen.getByTitle('Visualizar transcrição');
            fireEvent.click(viewBtn);
            expect(onView).toHaveBeenCalledWith(mockTaskSuccess);

            const trainBtn = screen.getByTitle('Treinamento com IA');
            fireEvent.click(trainBtn);
            expect(onTrain).toHaveBeenCalledWith(mockTaskSuccess);

            const deleteBtn = screen.getByTitle('Excluir transcrição');
            fireEvent.click(deleteBtn);
            expect(onDelete).toHaveBeenCalledWith(mockTaskSuccess);
        });

        it('deve exibir input de edição quando isEditing=true', () => {
            const onSaveRename = vi.fn();
            const setEditValue = vi.fn();

            render(
                <table>
                    <tbody>
                        <TaskRow
                            task={mockTaskSuccess}
                            isSelected={true}
                            onToggleSelect={vi.fn()}
                            isEditing={true}
                            editValue="novo_nome.wav"
                            setEditValue={setEditValue}
                            onStartEditing={vi.fn()}
                            onSaveRename={onSaveRename}
                            onCancelEditing={vi.fn()}
                            formatDate={formatDate}
                            getStatusBadge={getStatusBadge}
                            onViewTranscription={vi.fn()}
                            onTrainAI={vi.fn()}
                            onRetry={vi.fn()}
                            onDeleteTask={vi.fn()}
                        />
                    </tbody>
                </table>
            );

            const input = screen.getByDisplayValue('novo_nome.wav');
            expect(input).toBeInTheDocument();

            const saveBtn = screen.getByRole('button', { name: '💾' });
            fireEvent.click(saveBtn);
            expect(onSaveRename).toHaveBeenCalledWith('task-100');
        });
    });

    describe('TasksTablePagination Component', () => {
        it('deve alternar páginas e alterar limite por página', () => {
            const setItemsPerPage = vi.fn();
            const setCurrentPage = vi.fn();

            render(
                <TasksTablePagination
                    itemsPerPage={20}
                    setItemsPerPage={setItemsPerPage}
                    setCurrentPage={setCurrentPage}
                    currentPage={1}
                    totalPages={5}
                />
            );

            expect(screen.getByText('Página 1 de 5')).toBeInTheDocument();

            const nextBtn = screen.getByRole('button', { name: /Próxima/i });
            fireEvent.click(nextBtn);
            expect(setCurrentPage).toHaveBeenCalled();

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '50' } });
            expect(setItemsPerPage).toHaveBeenCalledWith(50);
        });
    });
});

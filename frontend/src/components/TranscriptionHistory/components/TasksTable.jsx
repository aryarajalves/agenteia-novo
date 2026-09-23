import React, { useState } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionActions } from '../hooks/useTranscriptionActions';
import {
    formatDate,
    getStatusBadge,
    TasksTableEmptyState,
    ActiveUploadRow,
    TaskRow,
    TasksTablePagination
} from './TasksTableModules';

const TasksTable = () => {
    const {
        tasks,
        selectedIds,
        itemsPerPage,
        setItemsPerPage,
        totalTasks,
        currentPage,
        setCurrentPage,
        activeUploads,
        setTaskToDelete,
        setSelectedTaskForView,
        setIsTrainingModalOpen,
        setTaskForTraining
    } = useTranscription();

    const {
        toggleSelectOne,
        toggleSelectAll,
        handleSaveRename,
        handleRetry
    } = useTranscriptionActions();

    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const totalPages = Math.ceil(totalTasks / itemsPerPage);

    const startEditing = (task) => {
        setEditingId(task.id);
        setEditValue(task.filename);
    };

    const saveRename = async (id) => {
        if (!editValue.trim()) return;
        try {
            const success = await handleSaveRename(id, editValue.trim());
            if (success) {
                setEditingId(null);
            } else {
                alert('Erro ao renomear arquivo: O servidor não aceitou a alteração (Verifique a conexão ou permissões).');
            }
        } catch (err) {
            alert('Erro crítico ao tentar renomear. Tente novamente mais tarde.');
        }
    };

    return (
        <div className="tasks-table-container">
            {tasks.length === 0 && activeUploads.length === 0 ? (
                <TasksTableEmptyState />
            ) : (
                <table className="tasks-table">
                    <thead>
                        <tr>
                            <th>
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.size === tasks.length && tasks.length > 0}
                                    onChange={() => toggleSelectAll(tasks)}
                                />
                            </th>
                            <th>Arquivo</th>
                            <th>Status</th>
                            <th>Data</th>
                            <th>Custo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeUploads.map(upload => (
                            <ActiveUploadRow
                                key={upload.id}
                                upload={upload}
                                formatDate={formatDate}
                            />
                        ))}
                        {tasks.map(task => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                isSelected={selectedIds.has(task.id)}
                                onToggleSelect={() => toggleSelectOne(task.id)}
                                isEditing={editingId === task.id}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onStartEditing={startEditing}
                                onSaveRename={saveRename}
                                onCancelEditing={() => setEditingId(null)}
                                formatDate={formatDate}
                                getStatusBadge={getStatusBadge}
                                onViewTranscription={setSelectedTaskForView}
                                onTrainAI={(t) => {
                                    setTaskForTraining(t);
                                    setIsTrainingModalOpen(true);
                                }}
                                onRetry={handleRetry}
                                onDeleteTask={setTaskToDelete}
                            />
                        ))}
                    </tbody>
                </table>
            )}

            {tasks.length > 0 && (
                <TasksTablePagination
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    setCurrentPage={setCurrentPage}
                    currentPage={currentPage}
                    totalPages={totalPages}
                />
            )}
        </div>
    );
};

export default TasksTable;

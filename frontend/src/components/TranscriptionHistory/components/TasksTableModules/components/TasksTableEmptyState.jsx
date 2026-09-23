import React from 'react';

const TasksTableEmptyState = () => {
    return (
        <div className="empty-state-card">
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>📑</div>
            <div>
                <h2 className="empty-title">Histórico Vazio</h2>
                <p className="empty-subtitle">
                    Você ainda não realizou nenhuma transcrição manual ou upload de arquivos para processamento.
                </p>
            </div>
        </div>
    );
};

export default TasksTableEmptyState;

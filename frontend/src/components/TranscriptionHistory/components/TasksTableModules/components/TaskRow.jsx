import React from 'react';

const TaskRow = ({
    task,
    isSelected,
    onToggleSelect,
    isEditing,
    editValue,
    setEditValue,
    onStartEditing,
    onSaveRename,
    onCancelEditing,
    formatDate,
    getStatusBadge,
    onViewTranscription,
    onTrainAI,
    onRetry,
    onDeleteTask
}) => {
    return (
        <tr key={task.id}>
            <td>
                <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={onToggleSelect}
                />
            </td>
            <td>
                {isEditing ? (
                    <div className="edit-name-row">
                        <input 
                            type="text" 
                            value={editValue} 
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onSaveRename(task.id)}
                            autoFocus
                        />
                        <button type="button" className="save-edit-btn" onClick={() => onSaveRename(task.id)}>💾</button>
                        <button type="button" className="cancel-edit-btn" onClick={onCancelEditing}>❌</button>
                    </div>
                ) : (
                    <div className="filename-row">
                        <span className="filename-text">{task.filename}</span>
                        <button type="button" className="edit-name-btn" onClick={() => onStartEditing(task)}>✏️</button>
                    </div>
                )}
            </td>
            <td>{getStatusBadge(task)}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(task.created_at)}</td>
            <td style={{ whiteSpace: 'nowrap', color: '#10b981', fontWeight: '500' }}>
                {task.cost_usd ? `$${task.cost_usd.toFixed(2)}` : '$0.00'}
            </td>
            <td>
                <div className="row-actions">
                    {task.status === 'SUCCESS' && (
                        <>
                            <button 
                                type="button"
                                className="view-transcription-btn" 
                                onClick={() => onViewTranscription(task)}
                                title="Visualizar transcrição"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#60a5fa',
                                    fontSize: '1rem',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '4px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(96, 165, 250, 0.15)';
                                    e.target.style.transform = 'scale(1.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                📝
                            </button>
                            <button 
                                type="button"
                                className="train-ai-btn" 
                                onClick={() => onTrainAI(task)}
                                title="Treinamento com IA"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#c084fc',
                                    fontSize: '1rem',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '4px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(192, 132, 252, 0.15)';
                                    e.target.style.transform = 'scale(1.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                🧠
                            </button>
                        </>
                    )}
                    {task.status === 'FAILURE' && (
                        <button 
                            type="button"
                            className="retry-btn" 
                            onClick={() => onRetry(task.id)}
                            title="Tentar transcrever novamente"
                        >
                            🔄
                        </button>
                    )}
                    <button 
                        type="button"
                        className="delete-item-btn" 
                        onClick={() => onDeleteTask(task)}
                        title="Excluir transcrição"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            fontSize: '1rem',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.target.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default TaskRow;

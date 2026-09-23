import React from 'react';
import { uploadManager } from '../../../../../api/uploadManager';

const ActiveUploadRow = ({ upload, formatDate }) => {
    return (
        <tr key={upload.id} className="active-upload-row">
            <td>
                <input 
                    type="checkbox" 
                    disabled 
                />
            </td>
            <td>
                <div className="filename-row">
                    <span className="filename-text" style={{ opacity: 0.8 }}>{upload.filename}</span>
                </div>
                {upload.status === 'uploading' && (
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${upload.progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.3s ease' }} />
                    </div>
                )}
            </td>
            <td>
                {upload.status === 'uploading' ? (
                    <span className="status-badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        📤 Enviando {upload.progress}%
                    </span>
                ) : upload.status === 'completed' ? (
                    <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        ⏳ Enviado
                    </span>
                ) : (
                    <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }} title={upload.error}>
                        ❌ Erro no Envio
                    </span>
                )}
            </td>
            <td style={{ whiteSpace: 'nowrap', opacity: 0.6 }}>{formatDate(upload.created_at)}</td>
            <td style={{ whiteSpace: 'nowrap', opacity: 0.5 }}>-</td>
            <td>
                <div className="row-actions">
                    {upload.status === 'error' && (
                        <button 
                            type="button"
                            className="cancel-edit-btn" 
                            onClick={() => uploadManager.removeUpload(upload.id)}
                            title="Remover erro"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            ❌
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default ActiveUploadRow;

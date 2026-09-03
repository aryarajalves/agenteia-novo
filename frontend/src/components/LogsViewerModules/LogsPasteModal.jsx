import React from 'react';
import { inputStyle } from './constants';

const LogsPasteModal = ({ pastedText, setPastedText, onAnalyze, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%' }}>
                <span className="modal-icon">📋</span>
                <h2 className="modal-title">Colar Logs Manualmente</h2>
                <p className="modal-message">Cole abaixo linhas de log copiadas de qualquer lugar (ex: Portainer). Elas serão analisadas localmente, sem chamar o servidor.</p>
                <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="2026-07-01 16:18:30 - services.scheduler - INFO - mensagem..."
                    rows={10}
                    style={{ ...inputStyle, marginTop: '1rem', fontFamily: 'monospace', resize: 'vertical' }}
                />
                <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button className="modal-btn modal-btn-confirm" onClick={onAnalyze} disabled={!pastedText.trim()}>Analisar</button>
                </div>
            </div>
        </div>
    );
};

export default LogsPasteModal;

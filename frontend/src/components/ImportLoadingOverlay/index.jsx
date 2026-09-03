import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './styles/ImportLoadingOverlay.css';

export default function ImportLoadingOverlay({
    isOpen,
    title = 'Importando Perguntas e Respostas...',
    message = 'Processando o arquivo JSON e indexando os itens na base de conhecimento. Aguarde um momento...',
    icon = '🧠'
}) {
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const overlayContent = (
        <div 
            className="import-loading-overlay" 
            data-testid="import-loading-overlay"
            role="dialog"
            aria-modal="true"
            aria-live="polite"
        >
            <div 
                className="import-loading-card" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="import-loading-glow" />
                
                <div className="import-loading-icon-wrapper">
                    <div className="import-spinner-ring" />
                    <div className="import-spinner-ring-inner" />
                    <span className="import-icon-center">{icon}</span>
                </div>

                <h2 className="import-loading-title">{title}</h2>
                <p className="import-loading-message">{message}</p>

                <div className="import-progress-bar-container">
                    <div className="import-progress-bar-indeterminate" />
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(overlayContent, document.body);
    }

    return overlayContent;
}

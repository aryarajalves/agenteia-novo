import React from 'react';
import { createPortal } from 'react-dom';

const PlaygroundLoadingOverlay = ({ isNavigating }) => {
    return createPortal(
        <div className="playground-loading-overlay">
            <div className="loading-card">
                <div className="premium-spinner"></div>
                <p>{isNavigating ? 'Abrindo configurações do agente...' : 'Preparando ambiente de teste...'}</p>
                <div className="loading-progress-bar">
                    <div className="progress-fill"></div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PlaygroundLoadingOverlay;


import React from 'react';

export default function TrainingModalHeader({ filename }) {
    return (
        <div className="training-modal-header">
            <div className="training-header-title-wrapper">
                <span className="training-header-icon">🧠</span>
                <div>
                    <h2 className="training-header-title">Treinamento com IA</h2>
                    <p className="training-header-subtitle">
                        De: <strong style={{ color: '#c084fc' }}>{filename}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}

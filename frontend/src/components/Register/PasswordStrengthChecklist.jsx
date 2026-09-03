import React from 'react';

export const PasswordStrengthChecklist = ({ rules, showMatch }) => {
    return (
        <div className="password-checklist-box">
            <div className="checklist-title">
                <span>🔒</span> Requisitos de Segurança da Senha:
            </div>
            <div className="checklist-items-grid">
                <div className={`checklist-item ${rules.hasMinLength ? 'valid' : 'invalid'}`}>
                    <span className="status-icon">{rules.hasMinLength ? '✓' : '•'}</span>
                    <span>Mínimo 10 caracteres</span>
                </div>
                <div className={`checklist-item ${rules.hasLetter ? 'valid' : 'invalid'}`}>
                    <span className="status-icon">{rules.hasLetter ? '✓' : '•'}</span>
                    <span>Pelo menos 1 letra</span>
                </div>
                <div className={`checklist-item ${rules.hasNumber ? 'valid' : 'invalid'}`}>
                    <span className="status-icon">{rules.hasNumber ? '✓' : '•'}</span>
                    <span>Pelo menos 1 número</span>
                </div>
                <div className={`checklist-item ${rules.hasSpecial ? 'valid' : 'invalid'}`}>
                    <span className="status-icon">{rules.hasSpecial ? '✓' : '•'}</span>
                    <span>1 caractere especial (!@#$)</span>
                </div>
            </div>

            {showMatch && (
                <div className={`checklist-match-status ${rules.isMatched ? 'matched' : 'unmatched'}`}>
                    <span>{rules.isMatched ? '✓' : '✕'}</span>
                    <span>{rules.isMatched ? 'As senhas coincidem' : 'As senhas não coincidem'}</span>
                </div>
            )}
        </div>
    );
};

export default PasswordStrengthChecklist;

import React from 'react';

export const QualificationScoringTab = ({
    qualificationCriteria,
    setQualificationCriteria,
    onOpenCriteriaModal
}) => {
    return (
        <div className="form-section" style={{ marginTop: 0, position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="section-label" style={{ margin: 0 }}>🔥 Diretrizes e Critérios do Lead Scoring</span>
                <button 
                    type="button" 
                    onClick={onOpenCriteriaModal} 
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                >
                    🔍 Maximizar
                </button>
            </div>
            <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                Defina as regras de negócio e critérios que a IA utilizará para pontuar o lead (de 0 a 100) e classificá-lo em Quente 🔥, Morno ⚡ ou Frio ❄️ com base nas respostas dadas neste funil.
            </p>
            <textarea
                placeholder={`Ex: Avalie o lead com base nos seguintes critérios:
- Se ele tem orçamento maior que R$ 5.000 para investir em mentoria, atribua +50 pontos.
- Se ele quer começar imediatamente, atribua +30 pontos.
- Se ele já tentou outras soluções sem sucesso, atribua +20 pontos.
Classifique como Quente 🔥 se a pontuação for >= 70, Morno ⚡ se for de 40 a 69, e Frio ❄️ se for < 40.`}
                value={qualificationCriteria || ''}
                onChange={(e) => setQualificationCriteria(e.target.value)}
                style={{ minHeight: '180px' }}
            />
        </div>
    );
};

export default QualificationScoringTab;


import React from 'react';

const LeadScoringCardDetails = ({
    lead,
    isRecalculating,
    onRecalculate
}) => {
    return (
        <div className="lead-card-content">
            {/* Perguntas e Respostas */}
            <div className="lead-details-section">
                <h4 className="lead-section-title">💬 Respostas de Qualificação</h4>
                <div className="qa-list">
                    {Array.isArray(lead.respostas_decoded) && lead.respostas_decoded.length > 0 ? (
                        lead.respostas_decoded.map((qa, index) => (
                            <div key={index} className="qa-item">
                                <div className="qa-question">
                                    Perg: {qa.pergunta || qa.question || `Pergunta ${index + 1}`}
                                </div>
                                <div className="qa-answer">
                                    {qa.resposta || qa.answer || "Sem resposta"}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="qa-item">
                            <div className="qa-answer" style={{ color: 'var(--text-secondary)' }}>
                                {typeof lead.respostas_decoded === 'string' 
                                    ? lead.respostas_decoded 
                                    : 'Nenhuma resposta decodificada.'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Justificativa da IA */}
            {lead.lead_justification && (
                <div className="lead-details-section">
                    <h4 className="lead-section-title">🧠 Justificativa da IA</h4>
                    <div className="justification-block">
                        <p className="justification-text">
                            {lead.lead_justification}
                        </p>
                    </div>
                </div>
            )}

            {/* Ações */}
            <div className="lead-card-actions">
                <button
                    className="btn-lead-action recalc"
                    onClick={(e) => onRecalculate(e, lead)}
                    disabled={isRecalculating}
                >
                    {isRecalculating ? (
                        <>
                            <div className="mini-spinner"></div>
                            <span>Recalculando...</span>
                        </>
                    ) : (
                        <>
                            <span>🔄</span>
                            <span>Recalcular Score</span>
                        </>
                    )}
                </button>

                {(lead.chatwoot_conversation_url || lead.telefone) && (
                    <a
                        href={lead.chatwoot_conversation_url || `https://web.whatsapp.com/send?phone=${String(lead.telefone).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-lead-action chatwoot"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span>💬</span>
                        <span>Conversar no ZapVoice</span>
                    </a>
                )}
            </div>
        </div>
    );
};

export default LeadScoringCardDetails;

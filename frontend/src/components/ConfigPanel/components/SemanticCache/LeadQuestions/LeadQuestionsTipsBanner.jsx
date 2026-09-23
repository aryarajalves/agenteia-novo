import React from 'react';

const LeadQuestionsTipsBanner = () => {
    return (
        <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <span>💡</span>
            <span>
                <strong>Dica de Economia:</strong> Dúvidas marcadas como <em>"Sem Cache"</em> custaram dinheiro ao chamar o modelo LLM. Ao clicar em <strong>"⚡ Adicionar ao Cache"</strong>, as próximas perguntas idênticas ou parecidas sairão com <strong>custo zero</strong> e resposta instantânea!
            </span>
        </div>
    );
};

export default LeadQuestionsTipsBanner;

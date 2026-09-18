import React from 'react';

const AUDIENCE_OPTIONS = [
    {
        id: 'retentativas',
        icon: '🔁',
        title: 'Re-tentativa (Disparo Inicial / Sem Resposta)',
        desc: 'Para contatos que receberam a 1ª mensagem de disparo e ainda não responderam nada.',
        color: '#38bdf8',
        borderActive: '#38bdf8',
        bgActive: 'rgba(56, 189, 248, 0.16)'
    },
    {
        id: 'remarketing',
        icon: '🎧',
        title: 'Remarketing D+1 (Pós-Conversa com IA)',
        desc: 'Para contatos que já conversaram com a IA mas pararam de responder antes de fechar a compra.',
        color: '#f59e0b',
        borderActive: '#f59e0b',
        bgActive: 'rgba(245, 158, 11, 0.16)'
    },
    {
        id: 'compradores',
        icon: '🎉',
        title: 'Compradores (Esteira Próximo Produto / Upsell)',
        desc: 'Para contatos que já compraram este produto e devem receber oferta do próximo produto/mentoria.',
        color: '#34d399',
        borderActive: '#10b981',
        bgActive: 'rgba(16, 185, 129, 0.16)'
    },
    {
        id: 'ambos',
        icon: '🌐',
        title: 'Qualquer Lead Inativo',
        desc: 'Dispara para qualquer contato que esteja inativo pelo tempo configurado, sem filtrar etapa.',
        color: '#c084fc',
        borderActive: '#a855f7',
        bgActive: 'rgba(168, 85, 247, 0.16)'
    }
];

const FollowupStepTargetAudience = ({ stepItem: st, updateStepProperty, stepType }) => {
    const currentAudience = st?.target_audience || (stepType === 'whatsapp_template' ? 'retentativas' : 'ambos');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                Defina qual perfil de contato deve receber este passo de follow-up na esteira:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                {AUDIENCE_OPTIONS.map((opt) => {
                    const isSelected = currentAudience === opt.id;
                    return (
                        <div
                            key={opt.id}
                            data-testid={`followup-audience-${opt.id}`}
                            onClick={() => updateStepProperty('target_audience', opt.id)}
                            style={{
                                padding: '0.75rem 0.9rem',
                                borderRadius: '10px',
                                border: isSelected ? `1.5px solid ${opt.borderActive}` : '1px solid rgba(255, 255, 255, 0.08)',
                                background: isSelected ? opt.bgActive : 'rgba(15, 23, 42, 0.4)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                transition: 'all 0.18s ease',
                                boxShadow: isSelected ? `0 0 14px ${opt.bgActive}` : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                                    <span style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: isSelected ? opt.color : '#e2e8f0'
                                    }}>
                                        {opt.title}
                                    </span>
                                </div>
                                <input
                                    type="radio"
                                    name={`target_audience_radio_${st?.step_index ?? 0}`}
                                    checked={isSelected}
                                    onChange={() => updateStepProperty('target_audience', opt.id)}
                                    style={{ accentColor: opt.color, cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: isSelected ? '#cbd5e1' : '#64748b', paddingLeft: '1.6rem', lineHeight: '1.35' }}>
                                {opt.desc}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FollowupStepTargetAudience;

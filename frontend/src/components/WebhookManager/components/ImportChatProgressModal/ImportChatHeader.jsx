import React from 'react';

const ImportChatHeader = ({ error, cancelled, done }) => {
    const icon = error ? '⚠️' : cancelled ? '🛑' : done ? '✅' : '📥';
    
    const iconBg = error
        ? 'rgba(239, 68, 68, 0.15)'
        : cancelled
            ? 'rgba(245, 158, 11, 0.15)'
            : done
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(99, 102, 241, 0.15)';

    const iconBorder = error
        ? 'rgba(239, 68, 68, 0.3)'
        : cancelled
            ? 'rgba(245, 158, 11, 0.3)'
            : done
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(99, 102, 241, 0.3)';

    const title = error
        ? 'Erro na Importação'
        : cancelled
            ? 'Importação Cancelada'
            : done
                ? 'Importação Concluída!'
                : 'Importando do ZapJords';

    const subtitle = error
        ? 'Ocorreu uma falha durante o processo'
        : cancelled
            ? 'Processo interrompido. Contatos já importados foram preservados.'
            : done
                ? 'Todos os contatos e memórias foram ingeridos'
                : 'Sincronizando conversas e mensagens sem custo de IA';

    const subtitleColor = error ? '#fca5a5' : cancelled ? '#fcd34d' : '#94a3b8';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: iconBg,
                border: `1px solid ${iconBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem'
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                    {title}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: subtitleColor }}>
                    {subtitle}
                </p>
            </div>
        </div>
    );
};

export default ImportChatHeader;

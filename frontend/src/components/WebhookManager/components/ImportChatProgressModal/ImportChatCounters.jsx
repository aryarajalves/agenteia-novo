import React from 'react';
import { formatDuration } from './utils';

const ImportChatCounters = ({ createdLeads, importedMessages, done, cancelled, isRunning, timerSec }) => {
    const timerBg = done
        ? 'rgba(16, 185, 129, 0.08)'
        : cancelled
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(59, 130, 246, 0.08)';

    const timerBorder = done
        ? 'rgba(16, 185, 129, 0.25)'
        : cancelled
            ? 'rgba(245, 158, 11, 0.25)'
            : 'rgba(59, 130, 246, 0.25)';

    const timerColor = done ? '#6ee7b7' : cancelled ? '#fcd34d' : '#93c5fd';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '10px',
                padding: '0.65rem 0.4rem',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                    Contatos Criados
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px' }}>
                    +{createdLeads}
                </div>
            </div>
            <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '0.65rem 0.4rem',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                    Mensagens Ingeridas
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6ee7b7', marginTop: '2px' }}>
                    +{importedMessages}
                </div>
            </div>
            <div style={{
                background: timerBg,
                border: `1px solid ${timerBorder}`,
                borderRadius: '10px',
                padding: '0.65rem 0.4rem',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                    {isRunning ? 'Tempo Decorrido' : 'Tempo Total'}
                </div>
                <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: timerColor,
                    marginTop: '2px',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    ⏱️ {formatDuration(timerSec)}
                </div>
            </div>
        </div>
    );
};

export default ImportChatCounters;

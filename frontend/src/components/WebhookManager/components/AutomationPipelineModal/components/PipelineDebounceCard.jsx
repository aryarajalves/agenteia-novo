import React from 'react';
import PipelineCountdown from '../../Common/PipelineCountdown';
import { parseDate } from '../utils/pipelineHelpers';

export default function PipelineDebounceCard({
    event,
    onFinished
}) {
    if (event.status !== 'waiting' || !event.scheduled_at) return null;

    const delaySeconds = Math.max(1, Math.round((parseDate(event.scheduled_at) - parseDate(event.created_at)) / 1000) || 0);

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ 
                position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                borderRadius: '50%', background: '#f59e0b', border: '4px solid #0f172a',
                boxShadow: '0 0 12px #f59e0b', zIndex: 1
            }} />
            <div style={{ 
                background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', 
                borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⏳</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fde68a' }}>Aguardando Debounce</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b45309' }}>Aguardando para agrupar mensagens...</p>
                    </div>
                </div>
                <div style={{ 
                    background: 'rgba(245, 158, 11, 0.15)', padding: '8px 16px', borderRadius: '12px',
                    color: '#f59e0b', fontWeight: 900, fontSize: '1.2rem'
                }}>
                    <PipelineCountdown 
                        isPending={true}
                        onFinished={onFinished}
                        serverNow={event.server_now}
                        step={{ 
                            timestamp: event.created_at, 
                            step: `${delaySeconds}s` 
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

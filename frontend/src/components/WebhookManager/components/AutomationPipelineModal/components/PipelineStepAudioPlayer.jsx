import React, { useRef, useState } from 'react';

/**
 * Player de áudio dedicado com controle de taxa de reprodução (1x, 1.5x, 2x)
 */
export default function PipelineStepAudioPlayer({ mediaUrl }) {
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const audioRef = useRef(null);

    const handleSpeedChange = (speed) => {
        setPlaybackRate(speed);
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    };

    if (!mediaUrl) return null;

    return (
        <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎙️</span> Áudio Original Recebido
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '2px' }}>
                        {[1.0, 1.5, 2.0].map((spd) => (
                            <button
                                key={spd}
                                onClick={() => handleSpeedChange(spd)}
                                style={{
                                    background: playbackRate === spd ? '#6366f1' : 'transparent',
                                    color: playbackRate === spd ? '#ffffff' : '#94a3b8',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                title={`Velocidade ${spd}x`}
                            >
                                {spd}x
                            </button>
                        ))}
                    </div>
                    <a 
                        href={mediaUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#818cf8', textDecoration: 'none', fontWeight: 700 }}
                    >
                        Abrir Link ↗
                    </a>
                </div>
            </div>
            <audio 
                ref={audioRef}
                controls 
                src={mediaUrl} 
                style={{ width: '100%', height: '36px', borderRadius: '8px', outline: 'none' }} 
            />
        </div>
    );
}

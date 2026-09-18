import React from 'react';
import { resolveMediaUrl } from './utils/mediaUtils';

const QuestionFunnelStepItem = ({
    step,
    idx,
    stepsCount,
    uploadingIndex,
    onUpdateStep,
    onMoveStep,
    onRemoveStep,
    onUploadAudio,
    onMaximize
}) => {
    return (
        <div 
            style={{
                background: '#0f172a',
                border: step.type === 'audio' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '10px',
                padding: '0.85rem'
            }}
        >
            {/* Step Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                        Passo #{idx + 1}
                    </span>
                    <select
                        value={step.type}
                        onChange={(e) => onUpdateStep(idx, 'type', e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.78rem' }}
                    >
                        <option value="audio">🎙️ Áudio Gravado (PTT)</option>
                        <option value="text">💬 Mensagem de Texto</option>
                        <option value="image">🖼️ Imagem</option>
                        <option value="video">🎥 Vídeo</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button 
                        type="button" 
                        onClick={() => onMoveStep(idx, -1)} 
                        disabled={idx === 0} 
                        style={{ background: '#1e293b', border: '1px solid #334155', color: idx === 0 ? '#475569' : '#cbd5e1', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: idx === 0 ? 'default' : 'pointer' }}
                    >
                        ↑
                    </button>
                    <button 
                        type="button" 
                        onClick={() => onMoveStep(idx, 1)} 
                        disabled={idx === stepsCount - 1} 
                        style={{ background: '#1e293b', border: '1px solid #334155', color: idx === stepsCount - 1 ? '#475569' : '#cbd5e1', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: idx === stepsCount - 1 ? 'default' : 'pointer' }}
                    >
                        ↓
                    </button>
                    <button 
                        type="button" 
                        onClick={() => onRemoveStep(idx)} 
                        disabled={stepsCount <= 1} 
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: stepsCount <= 1 ? 'default' : 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Audio Specific Fields */}
            {step.type === 'audio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            placeholder="URL do arquivo de áudio (https://...mp3 ou use upload)"
                            value={step.media_url || ''}
                            onChange={(e) => onUpdateStep(idx, 'media_url', e.target.value)}
                            style={{ flex: 1, padding: '0.4rem 0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem' }}
                        />
                        <label style={{ padding: '0.4rem 0.75rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: uploadingIndex === idx ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                            {uploadingIndex === idx ? '⏳ Enviando...' : '📁 Upload Áudio'}
                            <input 
                                type="file" 
                                accept="audio/*"
                                style={{ display: 'none' }}
                                onChange={(e) => e.target.files && e.target.files[0] && onUploadAudio(idx, e.target.files[0])}
                            />
                        </label>
                    </div>

                    {step.media_url && (
                        <audio controls src={resolveMediaUrl(step.media_url)} style={{ width: '100%', height: '36px', marginTop: '0.2rem' }} />
                    )}

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                                🧠 Transcrição / Resumo do que o áudio fala (Alimenta a memória da IA para os turnos seguintes):
                            </label>
                            <button
                                type="button"
                                data-testid={`maximize-step-audio-${idx}`}
                                onClick={() => onMaximize && onMaximize(idx, 'transcription', `🎙️ Transcrição do Passo #${idx + 1}`)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#34d399',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600
                                }}
                            >
                                ⛶ Maximizar Campo
                            </button>
                        </div>
                        <textarea 
                            rows={2}
                            placeholder="Ex: O curso é 100% online com certificado oficial e aulas práticas demonstrando a técnica em modelos reais..."
                            value={step.transcription || ''}
                            onChange={(e) => onUpdateStep(idx, 'transcription', e.target.value)}
                            style={{ width: '100%', padding: '0.4rem 0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem', resize: 'vertical' }}
                        />
                    </div>
                </div>
            )}

            {/* Text Specific Field */}
            {step.type === 'text' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                            💬 Mensagem de Texto:
                        </label>
                        <button
                            type="button"
                            data-testid={`maximize-step-text-${idx}`}
                            onClick={() => onMaximize && onMaximize(idx, 'content', `💬 Mensagem do Passo #${idx + 1}`)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#60a5fa',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600
                            }}
                        >
                            ⛶ Maximizar Campo
                        </button>
                    </div>
                    <textarea 
                        rows={2}
                        placeholder="Digite o texto da mensagem de acompanhamento ou fechamento..."
                        value={step.content || ''}
                        onChange={(e) => onUpdateStep(idx, 'content', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem 0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.82rem', resize: 'vertical' }}
                    />
                </div>
            )}

            {/* Delay in Seconds */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    ⏱️ Delay antes de enviar este passo:
                </label>
                <input 
                    type="number" 
                    min="0" 
                    max="120"
                    value={step.delay_seconds || 0}
                    onChange={(e) => onUpdateStep(idx, 'delay_seconds', parseInt(e.target.value) || 0)}
                    style={{ width: '65px', padding: '0.25rem 0.4rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>segundos</span>
            </div>
        </div>
    );
};

export default QuestionFunnelStepItem;

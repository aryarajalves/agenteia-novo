import React from 'react';

const FollowupStepMedia = ({
    stepIndex: i,
    stepItem: st,
    updateStepProperty,
    uploadingMediaIndex,
    handleUploadStepMedia
}) => {
    return (
        <div style={{ marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🎥 Anexo de Mídia (Vídeo / Áudio / Imagem / Documento)
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <select 
                    value={st.media_type || 'none'} 
                    onChange={e => updateStepProperty('media_type', e.target.value)} 
                    className="premium-input" 
                    style={{ width: '175px', padding: '0.4rem 0.5rem', fontSize: '0.78rem', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                >
                    <option value="none">🚫 Sem Mídia</option>
                    <option value="video">🎥 Vídeo (MP4)</option>
                    <option value="audio">🎙️ Áudio Gravado (PTT)</option>
                    <option value="image">🖼️ Imagem / Foto</option>
                    <option value="document">📄 Documento / PDF</option>
                </select>
                
                {st.media_type && st.media_type !== 'none' && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                        <input 
                            type="text" 
                            placeholder={st.media_type === 'video' ? 'https://servidor.com/video.mp4' : st.media_type === 'audio' ? 'https://servidor.com/audio.mp3' : 'https://servidor.com/arquivo...'} 
                            value={st.media_url || ''} 
                            onChange={e => updateStepProperty('media_url', e.target.value)} 
                            className="premium-input" 
                            style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.78rem' }} 
                        />
                        <label 
                            style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                background: 'rgba(52, 211, 153, 0.15)',
                                border: '1px solid #34d399',
                                color: '#34d399',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: uploadingMediaIndex === i ? 'wait' : 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.15s'
                            }}
                        >
                            {uploadingMediaIndex === i ? '⏳ Enviando...' : '📁 Upload Mídia'}
                            <input 
                                type="file" 
                                onChange={e => e.target.files && e.target.files[0] && handleUploadStepMedia(i, e.target.files[0])} 
                                accept={st.media_type === 'video' ? 'video/*' : st.media_type === 'audio' ? 'audio/*' : st.media_type === 'image' ? 'image/*' : '*/*'}
                                style={{ display: 'none' }}
                                disabled={uploadingMediaIndex === i}
                            />
                        </label>
                    </div>
                )}
            </div>
            {st.media_type && st.media_type !== 'none' && st.media_url && (
                <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                        👁️ Pré-visualização da Mídia:
                    </div>
                    {st.media_type === 'video' && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <video 
                                controls 
                                src={st.media_url} 
                                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
                            />
                        </div>
                    )}
                    {st.media_type === 'audio' && (
                        <audio controls src={st.media_url} style={{ width: '100%', height: '36px' }} />
                    )}
                    {st.media_type === 'image' && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <img 
                                src={st.media_url} 
                                alt="Preview da Mídia" 
                                style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }} 
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                    {st.media_type === 'document' && (
                        <a href={st.media_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            📄 Abrir Documento em nova aba 🔗
                        </a>
                    )}
                </div>
            )}

            {st.media_type && st.media_type !== 'none' && (
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    {st.media_type === 'video' ? 'O vídeo será enviado diretamente no chat do WhatsApp para o contato.' : st.media_type === 'audio' ? 'No WhatsApp, áudios serão reproduzidos como voz gravada na hora (PTT).' : 'A mídia será enviada diretamente junto com o follow-up.'}
                </p>
            )}
        </div>
    );
};

export default FollowupStepMedia;

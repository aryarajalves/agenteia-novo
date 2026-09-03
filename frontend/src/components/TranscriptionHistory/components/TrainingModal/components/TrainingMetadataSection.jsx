import React from 'react';

export default function TrainingMetadataSection({
    showMetadata,
    setShowMetadata,
    metaVideoName,
    setMetaVideoName,
    metaModule,
    setMetaModule,
    metaChapter,
    setMetaChapter,
    metadataVal
}) {
    return (
        <div className="training-metadata-section">
            <button 
                className="training-metadata-toggle" 
                onClick={() => setShowMetadata(p => !p)} 
                aria-expanded={showMetadata} 
                type="button"
            >
                <span>🏷️ &nbsp;Metadados do Vídeo <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.8rem' }}>(opcional)</span></span>
                <span className={`training-metadata-arrow${showMetadata ? ' open' : ''}`}>▾</span>
            </button>
            {showMetadata && (
                <div className="training-metadata-fields">
                    <p className="training-metadata-hint">
                        Os metadados são salvos junto a cada item e permitem que o agente cite a origem da resposta com precisão.
                    </p>
                    <div className="training-meta-grid">
                        <div className="training-form-group">
                            <label>Nome do Vídeo / Aula</label>
                            <input 
                                type="text" 
                                value={metaVideoName} 
                                onChange={e => setMetaVideoName(e.target.value)} 
                                placeholder="Ex: Introdução ao Funil de Vendas" 
                                className="training-meta-input" 
                                id="meta-video-name" 
                            />
                        </div>
                        <div className="training-form-group">
                            <label>Módulo do Curso</label>
                            <input 
                                type="text" 
                                value={metaModule} 
                                onChange={e => setMetaModule(e.target.value)} 
                                placeholder="Ex: Módulo 3 - Captação" 
                                className="training-meta-input" 
                                id="meta-module" 
                            />
                        </div>
                        <div className="training-form-group">
                            <label>Capítulo</label>
                            <input 
                                type="text" 
                                value={metaChapter} 
                                onChange={e => setMetaChapter(e.target.value)} 
                                placeholder="Ex: Capítulo 2" 
                                className="training-meta-input" 
                                id="meta-chapter" 
                            />
                        </div>
                    </div>
                    <div className="training-metadata-preview">
                        <span className="training-metadata-preview-label">Metadado salvo:</span>
                        <code className="training-metadata-preview-value">{metadataVal}</code>
                    </div>
                </div>
            )}
        </div>
    );
}

import React from 'react';
import { createPortal } from 'react-dom';

const InputArea = ({
    input,
    setInput,
    loading,
    isRecording,
    isInputExpanded,
    setIsInputExpanded,
    handleSendMessage,
    handleVoiceRecord,
    imagePreview,
    selectedImage,
    isUploading,
    handleRemoveImage,
    handleImageSelect,
    fileInputRef,
    sessionId,
    isRegularUser,
    isViewMode,
    isTesterAutoRunning,
    fetchSummary,
    fetchQuestions,
    hasTesterReport,
    fetchTestReport
}) => {
    if (isViewMode) return null;

    return (
        <div className={`chat-input-wrapper-modern ${isInputExpanded ? 'expanded-mode' : ''}`}>
            {/* Preview da Imagem Selecionada */}
            {imagePreview && (
                <div className="image-preview-overlay fade-in">
                    <div className="preview-img-box">
                        <img src={imagePreview} alt="Preview" />
                        {isUploading && (
                            <div className="upload-overlay">
                                <div className="spinner-mini"></div>
                            </div>
                        )}
                    </div>
                    <div className="preview-info">
                        <p className="filename">{selectedImage?.name}</p>
                        <p className="filesize">{(selectedImage?.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={handleRemoveImage} className="remove-preview">✕</button>
                </div>
            )}

            <form onSubmit={handleSendMessage} className={`input-container-premium ${isInputExpanded ? 'is-expanded' : ''}`}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    accept="image/*"
                />

                {isInputExpanded ? (
                    /* MODO EXPANDIDO (Só ativa quando clica no botão ⤢) */
                    <>
                        <div className="expanded-input-header">
                            <div className="expanded-header-title">
                                <span>📝</span>
                                <span className="title-text">Editor Expandido de Mensagem</span>
                            </div>
                            <button
                                type="button"
                                className="btn-minimize-input"
                                onClick={() => setIsInputExpanded(false)}
                                title="Minimizar caixa de mensagem"
                            >
                                ↙ Minimizar
                            </button>
                        </div>

                        <textarea
                            className="chat-input-premium textarea-expanded custom-scrollbar"
                            placeholder={isTesterAutoRunning ? '🤖 Teste Automático...' : (loading ? 'Pensando...' : 'Digite sua mensagem detalhada aqui... (Shift + Enter para quebrar linha)')}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || isTesterAutoRunning}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            rows={6}
                        />

                        <div className="input-toolbar-footer">
                            <div className="input-actions-left">
                                <button
                                    type="button"
                                    className={`action-btn-circle ${imagePreview ? 'active' : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading || isTesterAutoRunning}
                                    title="Enviar imagem"
                                >
                                    🖼️
                                </button>
                                <button
                                    type="button"
                                    className={`action-btn-circle ${isRecording ? 'recording' : ''}`}
                                    onClick={handleVoiceRecord}
                                    disabled={loading || isTesterAutoRunning}
                                    title="Enviar voz"
                                >
                                    {isRecording ? '🔴' : '🎙️'}
                                </button>
                                <button
                                    type="button"
                                    className="action-btn-circle btn-expand-chat active"
                                    onClick={() => setIsInputExpanded(false)}
                                    disabled={loading || isTesterAutoRunning}
                                    title="Minimizar editor"
                                    aria-label="Minimizar editor"
                                >
                                    ↙
                                </button>
                                <span className="expanded-char-counter">
                                    {input.length} caracteres | {input.split('\n').filter(Boolean).length || (input ? 1 : 0)} parágrafo(s)
                                </span>
                            </div>

                            <button
                                type="submit"
                                className="btn-send-modern"
                                disabled={loading || (!input.trim() && !imagePreview) || isTesterAutoRunning}
                            >
                                {isTesterAutoRunning ? '🔄' : (loading ? '⏳' : '🚀 Enviar')}
                            </button>
                        </div>
                    </>
                ) : (
                    /* MODO COMPACTO PADRÃO (1 linha horizontal perfeita) */
                    <>
                        <div className="input-actions-left">
                            <button
                                type="button"
                                className={`action-btn-circle ${imagePreview ? 'active' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || isTesterAutoRunning}
                                title="Enviar imagem"
                            >
                                🖼️
                            </button>
                            <button
                                type="button"
                                className={`action-btn-circle ${isRecording ? 'recording' : ''}`}
                                onClick={handleVoiceRecord}
                                disabled={loading || isTesterAutoRunning}
                                title="Enviar voz"
                            >
                                {isRecording ? '🔴' : '🎙️'}
                            </button>
                            <button
                                type="button"
                                className="action-btn-circle btn-expand-chat"
                                onClick={() => setIsInputExpanded(true)}
                                disabled={loading || isTesterAutoRunning}
                                title="Maximizar editor de texto"
                                aria-label="Maximizar editor de texto"
                            >
                                ⤢
                            </button>
                        </div>

                        <textarea
                            className="chat-input-premium custom-scrollbar"
                            placeholder={isTesterAutoRunning ? '🤖 Teste Automático...' : (loading ? 'Pensando...' : 'Mensagem para o agente...')}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || isTesterAutoRunning}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            rows={Math.min(5, Math.max(1, input.split('\n').length))}
                            style={{
                                height: input.includes('\n') ? 'auto' : undefined
                            }}
                        />

                        <button
                            type="submit"
                            className="btn-send-modern"
                            disabled={loading || (!input.trim() && !imagePreview) || isTesterAutoRunning}
                        >
                            {isTesterAutoRunning ? '🔄' : (loading ? '⏳' : '🚀')}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
};

export default InputArea;

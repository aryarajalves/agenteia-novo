import React from 'react';

const AdvisorInputArea = ({
    inputValue,
    setInputValue,
    selectedImage,
    setSelectedImage,
    isInputMaximized,
    setIsInputMaximized,
    isAdvisorLoading,
    isApplyingSuggestion,
    fileInputRef,
    handleFileChange,
    handleKeyPress,
    handlePaste,
    onSearch,
    handleApplySuggestions,
    onSend
}) => {
    return (
        <footer className="advisor-input-area">
            {selectedImage && (
                <div className="advisor-image-preview-container">
                    <img src={selectedImage} alt="Preview" className="advisor-image-preview" />
                    <button className="remove-image-btn" onClick={() => setSelectedImage(null)}>✕</button>
                </div>
            )}
            <div className="advisor-actions">
                <button 
                    className="advisor-action-chip"
                    onClick={onSearch}
                    disabled={isAdvisorLoading}
                    title="Buscar no conteúdo do prompt"
                >
                    🔍 Buscar Info
                </button>
                <button 
                    className="advisor-action-chip primary"
                    onClick={handleApplySuggestions}
                    disabled={isAdvisorLoading}
                    title="Aplicar sugestões ao editor"
                >
                    ✨ Aplicar ao Editor
                </button>
            </div>
            <div className="advisor-input-row">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <textarea 
                    className="advisor-input-textarea custom-scrollbar"
                    placeholder={isApplyingSuggestion ? "Aplicando alterações..." : "Peça para buscar ou alterar algo..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onPaste={handlePaste}
                    disabled={isAdvisorLoading}
                    rows={isInputMaximized ? 6 : 1}
                />
                <div className="advisor-input-buttons">
                    <button 
                        className="advisor-input-tool-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAdvisorLoading}
                        title="Anexar Imagem"
                    >
                        🖼️
                    </button>
                    <button 
                        className={`advisor-input-tool-btn ${isInputMaximized ? 'active' : ''}`}
                        onClick={() => setIsInputMaximized(!isInputMaximized)}
                        title={isInputMaximized ? "Minimizar caixa" : "Maximizar caixa"}
                    >
                        {isInputMaximized ? '🔽' : '🔼'}
                    </button>
                    <button 
                        className="advisor-send-btn"
                        onClick={onSend}
                        disabled={isAdvisorLoading}
                    >
                        ✈️
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default AdvisorInputArea;

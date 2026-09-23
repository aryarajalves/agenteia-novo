import React from 'react';
import {
    useKnowledgeBaseEditor,
    KnowledgeBaseEditorHeader,
    KnowledgeBaseMetadataForm,
    KnowledgeBaseSidePanel,
    KnowledgeBaseContentSection
} from './KnowledgeBaseEditorModules';

function KnowledgeBaseEditor() {
    const {
        id,
        isNew,
        view,
        name,
        setName,
        description,
        setDescription,
        kbType,
        setKbType,
        items,
        loading,
        status,
        setStatus,
        handleSave,
        handleAddItem,
        handleDeleteItem,
        handleUpdateItem,
        navigate
    } = useKnowledgeBaseEditor();

    if (loading) return <div className="loading">Carregando base...</div>;

    return (
        <div className="dashboard-container">
            <KnowledgeBaseEditorHeader 
                isNew={isNew} 
                view={view} 
                navigate={navigate} 
            />

            <div className="editor-layout" style={{ 
                display: 'grid', 
                gridTemplateColumns: view === 'metadata' ? '1fr 340px' : '1fr', 
                gap: '2.5rem',
                alignItems: 'start'
            }}>
                {/* Visualização de Identificação (Metadata) */}
                {view === 'metadata' && (
                    <>
                        <KnowledgeBaseMetadataForm
                            name={name}
                            setName={setName}
                            description={description}
                            setDescription={setDescription}
                            kbType={kbType}
                            setKbType={setKbType}
                            isNew={isNew}
                            handleSave={handleSave}
                        />

                        {/* Coluna da Direita: Dicas e Stats */}
                        <KnowledgeBaseSidePanel
                            isNew={isNew}
                            itemsCount={items.length}
                        />
                    </>
                )}

                {/* Visualização de Conteúdo */}
                {view === 'content' && !isNew && (
                    <KnowledgeBaseContentSection
                        id={id}
                        items={items}
                        onAddItem={handleAddItem}
                        onDeleteItem={handleDeleteItem}
                        onUpdateItem={handleUpdateItem}
                        kbType={kbType}
                    />
                )}
            </div>

            {status && (
                <div className={`save-status-toast status-message ${status.type}`} onClick={() => setStatus(null)}>
                    {status.message}
                </div>
            )}

            <style>{`
                .type-select-btn {
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                    background: rgba(255,255,255,0.02);
                    color: #94a3b8;
                    font-size: 0.85rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: center;
                }
                .type-select-btn:hover {
                    background: rgba(255,255,255,0.05);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}

export default KnowledgeBaseEditor;

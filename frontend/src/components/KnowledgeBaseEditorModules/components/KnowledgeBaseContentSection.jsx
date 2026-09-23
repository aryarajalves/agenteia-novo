import React from 'react';
import KnowledgeBaseManager from '../../KnowledgeBaseManager/index';

const KnowledgeBaseContentSection = ({
    id,
    items,
    onAddItem,
    onDeleteItem,
    onUpdateItem,
    kbType
}) => {
    return (
        <div className="content-card" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
            <div className="step-indicator">
                <div className="step-number">2</div>
                <span className="step-title">Biblioteca de Itens</span>
            </div>
            <KnowledgeBaseManager
                kbId={id}
                knowledgeBase={items}
                onAdd={onAddItem}
                onDelete={onDeleteItem}
                onUpdate={onUpdateItem}
                collapsible={false}
                kbType={kbType}
            />
        </div>
    );
};

export default KnowledgeBaseContentSection;

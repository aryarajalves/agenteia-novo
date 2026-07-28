import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../api/client';

const KBContext = createContext();

export const KBProvider = ({ children, initialKB, kbId, kbType, onAdd, onDelete, onUpdate, onChange }) => {
    // Basic State
    const [knowledgeBase, setKnowledgeBase] = useState(initialKB || []);
    const [kbLabels, setKbLabels] = useState({ question: 'Pergunta', answer: 'Resposta', metadata: 'Metadado' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [kbFilterTerm, setKbFilterTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isExpanded, setIsExpanded] = useState(true);

    // Modals & UI State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showImporter, setShowImporter] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    
    // Feature States (Simulador, Transcrição, etc.)
    const [simQuery, setSimQuery] = useState('');
    const [simResults, setSimResults] = useState(null);
    const [simLoading, setSimLoading] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    
    useEffect(() => {
        setKnowledgeBase(initialKB || []);
    }, [initialKB]);

    useEffect(() => {
        const fetchKbData = async () => {
            if (!kbId) return;
            try {
                const res = await api.get(`/knowledge-bases/${kbId}`);
                if (res.ok) {
                    const data = await res.json();
                    setKbLabels({
                        question: data.question_label || 'Pergunta',
                        answer: data.answer_label || 'Resposta',
                        metadata: data.metadata_label || 'Metadado'
                    });
                }
            } catch (e) {
                console.error("Erro ao buscar labels da KB:", e);
            }
        };
        fetchKbData();
    }, [kbId]);

    const reloadKnowledgeBase = async () => {
        if (!kbId) return;
        try {
            const res = await api.get(`/knowledge-bases/${kbId}`);
            if (res.ok) {
                const data = await res.json();
                setKnowledgeBase(data.items || []);
            }
        } catch (e) {
            console.error("Erro ao recarregar a KB:", e);
        }
    };

    const value = {
        kbId,
        kbType,
        knowledgeBase, setKnowledgeBase,
        reloadKnowledgeBase,
        kbLabels, setKbLabels,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        kbFilterTerm, setKbFilterTerm,
        typeFilter, setTypeFilter,
        selectedItems, setSelectedItems,
        isExpanded, setIsExpanded,
        isConfirmOpen, setIsConfirmOpen,
        isDeleting, setIsDeleting,
        itemToDelete, setItemToDelete,
        showImporter, setShowImporter,
        showSuccessModal, setShowSuccessModal,
        isEditOpen, setIsEditOpen,
        itemToEdit, setItemToEdit,
        simQuery, setSimQuery,
        simResults, setSimResults,
        simLoading, setSimLoading,
        isTranscribing, setIsTranscribing,
        // Callbacks
        onAdd, onDelete, onUpdate, onChange
    };

    return <KBContext.Provider value={value}>{children}</KBContext.Provider>;
};

export const useKB = () => {
    const context = useContext(KBContext);
    if (!context) throw new Error('useKB must be used within a KBProvider');
    return context;
};

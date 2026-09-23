import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import NewItemEditor from './NewItemEditor';
import QuestionItem from './QuestionItem';
import './styles.css';

const AnalysisModal = ({
    isOpen,
    onClose,
    analysisData,
    agentId,
    initialAgentConfig = null
}) => {
    if (!isOpen || !analysisData) return null;

    // States
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [coverageResults, setCoverageResults] = useState(null);
    const [checkingCoverage, setCheckingCoverage] = useState(false);

    // New Knowledge Item State
    const [newItemData, setNewItemData] = useState(null);
    const [isSavingItem, setIsSavingItem] = useState(false);

    // Knowledge Bases Check
    const [knowledgeBases, setKnowledgeBases] = useState([]);
    const [agentConfig, setAgentConfig] = useState(initialAgentConfig);

    useEffect(() => {
        setCoverageResults(null);

        // Fetch Agent Config if needed
        if (!agentConfig && agentId) {
            api.get(`/agents/${agentId}`)
                .then(res => res.json())
                .then(setAgentConfig)
                .catch(err => console.error("Erro ao carregar agente:", err));
        }

        // Fetch KBs
        api.get(`/knowledge-bases`)
            .then(res => res.json())
            .then(setKnowledgeBases)
            .catch(err => console.error("Erro ao carregar bases:", err));

    }, [analysisData, agentId]);

    // Helpers
    const copyToClipboard = async (text, index = null) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (index !== null) {
                setCopiedIndex(index);
                setTimeout(() => setCopiedIndex(null), 1500);
            } else {
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 2000);
            }
        } catch (err) { console.error('Failed to copy', err); }
    };

    const handleCopyAll = () => {
        let text = "";
        if (analysisData.type === 'questions' && Array.isArray(analysisData.content)) {
            text = analysisData.content.join('\n');
        } else if (analysisData.type === 'summary') {
            text = analysisData.content;
        }
        copyToClipboard(text);
    };

    const checkCoverage = async () => {
        if (!agentConfig) return alert("Dados do agente não carregados.");
        const kbId = agentConfig.knowledge_base_ids?.[0] || agentConfig.knowledge_base_id;
        if (!kbId) return alert("Este agente não tem Base de Conhecimento vinculada.");

        setCheckingCoverage(true);
        try {
            const res = await api.post(`/knowledge-bases/${kbId}/coverage`, {
                questions: analysisData.content
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const map = {};
            data.results.forEach(r => map[r.question] = r);
            setCoverageResults(map);
        } catch (e) {
            alert("Erro ao verificar: " + e.message);
        } finally {
            setCheckingCoverage(false);
        }
    };

    const handleAddItem = (question) => {
        const defaultKbId = agentConfig?.knowledge_base_ids?.[0] || agentConfig?.knowledge_base_id;
        setNewItemData({
            question,
            answer: "",
            category: "Descoberta",
            target_kb_id: defaultKbId || (knowledgeBases[0]?.id)
        });
    };

    const saveNewItem = async () => {
        if (!newItemData?.answer) return alert("Digite uma resposta.");
        setIsSavingItem(true);
        try {
            await api.post(`/knowledge-bases/${newItemData.target_kb_id}/items`, {
                question: newItemData.question,
                answer: newItemData.answer,
                category: newItemData.category
            });

            // Mark as covered locally
            setCoverageResults(prev => ({
                ...prev,
                [newItemData.question]: { status: 'green', best_match: { answer: newItemData.answer } }
            }));
            setNewItemData(null);
        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSavingItem(false);
        }
    };

    return (
        <div className="modal-backdrop fade-in">
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="header-icon">
                        {analysisData.type === 'summary' ? '📝' :
                            analysisData.type === 'questions' ? '💎' : '⚠️'}
                    </div>
                    <div className="header-info">
                        <h3>
                            {analysisData.type === 'summary' && 'Resumo Inteligente'}
                            {analysisData.type === 'questions' && 'Perguntas Detectadas'}
                            {analysisData.type === 'error' && 'Erro na Análise'}
                        </h3>
                        <p>
                            {analysisData.type === 'summary' && 'Síntese gerada por IA da conversa atual'}
                            {analysisData.type === 'questions' && `${analysisData.content?.length || 0} perguntas extraídas do contexto`}
                            {analysisData.type === 'error' && 'Falha ao processar solicitação'}
                        </p>
                    </div>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {newItemData && (
                        <NewItemEditor
                            newItemData={newItemData}
                            setNewItemData={setNewItemData}
                            knowledgeBases={knowledgeBases}
                            onSave={saveNewItem}
                            onCancel={() => setNewItemData(null)}
                            isSaving={isSavingItem}
                        />
                    )}

                    {analysisData.loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <span>Processando conversas com IA...</span>
                        </div>
                    ) : (
                        <>
                            {analysisData.type === 'questions' && (
                                <div className="questions-list">
                                    {analysisData.content.length === 0 ? (
                                        <div className="empty-state">
                                            <div className="empty-icon">🔍</div>
                                            <h3>Nenhuma pergunta encontrada</h3>
                                            <p>A IA analisou o contexto mas não identificou perguntas claras nestas conversas.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {!coverageResults && (
                                                <div className="toolbar">
                                                    <button className="btn-check-coverage" onClick={checkCoverage} disabled={checkingCoverage}>
                                                        {checkingCoverage ? 'Verificando...' : '🔍 Verificar Cobertura na Base'}
                                                    </button>
                                                </div>
                                            )}

                                            <div className="scroll-area custom-scrollbar">
                                                {analysisData.content.map((q, i) => (
                                                    <QuestionItem
                                                        key={i}
                                                        question={q}
                                                        index={i}
                                                        status={coverageResults?.[q]?.status}
                                                        match={coverageResults?.[q]?.best_match}
                                                        onLearn={handleAddItem}
                                                        onCopy={copyToClipboard}
                                                        isCopied={copiedIndex === i}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {analysisData.type === 'summary' && (
                                <div className="summary-text">
                                    {analysisData.content}
                                </div>
                            )}

                            {analysisData.type === 'error' && (
                                <div className="error-msg">{analysisData.content}</div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    {!analysisData.loading && analysisData.content?.length > 0 && (
                        <button className={`btn-copy-all ${copiedAll ? 'success' : ''}`} onClick={handleCopyAll}>
                            {copiedAll ? 'Copiado para Transferência!' : 'Copiar Tudo'}
                        </button>
                    )}
                    <button className="btn-close" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;

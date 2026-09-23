import React, { useState } from 'react';
import { api } from '../../api/client';
import { useObjections } from './hooks/useObjections';
import ObjectionsControlPanel from './components/ObjectionsControlPanel';
import ObjectionCard from './components/ObjectionCard';
import TrainRagModal from './components/TrainRagModal';
import './styles/objections.css';

const ObjectionsDashboard = () => {
    const {
        agents,
        selectedAgentId,
        setSelectedAgentId,
        knowledgeBases,
        clusters,
        loading,
        recalculating,
        toast,
        showToast,
        handleRecalculate
    } = useObjections();

    const [expandedClusterId, setExpandedClusterId] = useState(null);
    const [isRagModalOpen, setIsRagModalOpen] = useState(false);
    const [ragForm, setRagForm] = useState({ kbId: '', question: '', answer: '' });
    const [savingRag, setSavingRag] = useState(false);

    // Toggle expandir accordion
    const toggleExpandCluster = (id) => {
        setExpandedClusterId(prev => prev === id ? null : id);
    };

    // Abre o modal para treinar a base de conhecimento
    const openRagModal = (cluster) => {
        const currentAgent = agents.find(a => a.id.toString() === selectedAgentId);
        let defaultKbId = '';

        if (currentAgent) {
            if (currentAgent.knowledge_base_id) {
                defaultKbId = currentAgent.knowledge_base_id.toString();
            } else if (currentAgent.knowledge_base_ids && currentAgent.knowledge_base_ids.length > 0) {
                defaultKbId = currentAgent.knowledge_base_ids[0].toString();
            }
        }

        if (!defaultKbId && knowledgeBases.length > 0) {
            defaultKbId = knowledgeBases[0].id.toString();
        }

        setRagForm({
            kbId: defaultKbId,
            question: cluster.representative_question || '',
            answer: cluster.suggested_script || ''
        });
        setIsRagModalOpen(true);
    };

    // Submete a pergunta/resposta à base de RAG selecionada
    const handleSaveToRag = async (e) => {
        e.preventDefault();
        if (!ragForm.kbId) {
            showToast("Selecione uma Base de Conhecimento.", "error");
            return;
        }

        try {
            setSavingRag(true);
            const res = await api.post(`/knowledge-bases/${ragForm.kbId}/items`, {
                question: ragForm.question,
                answer: ragForm.answer,
                category: "Objeções do Robô"
            });

            if (res.ok) {
                showToast("Dúvida adicionada com sucesso à Base de Conhecimento! 📚", "success");
                setIsRagModalOpen(false);
            } else {
                const errData = await res.json();
                showToast(errData.detail || "Erro ao salvar na base de conhecimento.", "error");
            }
        } catch (error) {
            console.error("Erro ao salvar RAG:", error);
            showToast("Erro de rede ao salvar na base de conhecimento.", "error");
        } finally {
            setSavingRag(false);
        }
    };

    const maxCount = clusters.length === 0 ? 1 : Math.max(...clusters.map(c => c.count));

    return (
        <div className="objections-container">
            <header className="objections-header">
                <h1 className="objections-title">
                    <span>🏆</span> Ranking de Dúvidas & Objeções
                </h1>
                <p className="objections-subtitle">
                    Descubra quais são as dúvidas e objeções mais frequentes que os leads trazem e treine o robô para respondê-las com scripts persuasivos.
                </p>
            </header>

            {/* Painel Superior */}
            <ObjectionsControlPanel
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
                onRecalculate={handleRecalculate}
                loading={loading}
                recalculating={recalculating}
            />

            {/* Conteúdo Principal */}
            {loading && !recalculating ? (
                <div className="spinner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4rem 0' }}>
                    <div className="loading-spinner"></div>
                    <span className="loading-text" style={{ color: '#94a3b8', marginTop: '1rem' }}>Analisando interações e gerando ranking...</span>
                </div>
            ) : clusters.length === 0 ? (
                <div className="objections-empty">
                    <div className="empty-state-icon">🔮</div>
                    <h3 className="empty-state-title">Nenhuma dúvida recorrente identificada</h3>
                    <p className="empty-state-desc">
                        O agente ainda não possui interações suficientes registradas para formar grupos semânticos de dúvidas repetidas nos últimos 30 dias.
                    </p>
                    <button 
                        className="objections-recalc-btn" 
                        style={{ margin: '0 auto' }} 
                        onClick={handleRecalculate}
                        disabled={recalculating || !selectedAgentId}
                    >
                        Tentar Recalcular Agora
                    </button>
                </div>
            ) : (
                <div className="objections-list">
                    {clusters.map((cluster, index) => (
                        <ObjectionCard
                            key={cluster.id}
                            cluster={cluster}
                            index={index}
                            maxCount={maxCount}
                            isExpanded={expandedClusterId === cluster.id}
                            onToggleExpand={() => toggleExpandCluster(cluster.id)}
                            onOpenRagModal={openRagModal}
                        />
                    ))}
                </div>
            )}

            {/* Modal para Treinar RAG */}
            <TrainRagModal
                isOpen={isRagModalOpen}
                onClose={() => setIsRagModalOpen(false)}
                onSubmit={handleSaveToRag}
                ragForm={ragForm}
                setRagForm={setRagForm}
                knowledgeBases={knowledgeBases}
                savingRag={savingRag}
            />

            {/* Toast Notifications */}
            {toast && (
                <div className={`global-toast global-toast-${toast.type === 'error' ? 'error' : 'success'}`}>
                    <span className="global-toast-icon">
                        {toast.type === 'error' ? '❌' : '✅'}
                    </span>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default ObjectionsDashboard;

import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import HabilidadesGuideModal from './Modals/HabilidadesGuideModal';
import RagKnowledgeSection from './Habilidades/RagKnowledgeSection';
import ActionsToolsSection from './Habilidades/ActionsToolsSection';

const TabHabilidades = () => {
    const { showHabilidadesGuide, setShowHabilidadesGuide } = useConfig();
    const [activeSubTab, setActiveSubTab] = useState('rag');
    const [globalVars, setGlobalVars] = useState([]);

    useEffect(() => {
        api.get('/global-variables').then(res => {
            if (res && Array.isArray(res.data)) {
                setGlobalVars(res.data);
            }
        }).catch(err => {
            console.error("Erro ao carregar variáveis globais em TabHabilidades:", err);
        });
    }, []);

    const subTabs = [
        { id: 'rag', label: '📚 Conhecimento (RAG)', desc: 'Bases semânticas de dados' },
        { id: 'actions', label: '🔗 Ações & Ferramentas', desc: 'Integrações de API e ações' }
    ];

    return (
        <div className="fade-in">
            {/* Header da aba com Guia e Sub-abas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`toggle-option ${activeSubTab === tab.id ? 'active' : ''}`}
                            style={{ 
                                padding: '0.5rem 1.25rem', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '2px',
                                background: activeSubTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: activeSubTab === tab.id ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--wh-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <span style={{ color: activeSubTab === tab.id ? '#fff' : 'var(--wh-text-secondary)' }}>{tab.label}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500, color: activeSubTab === tab.id ? 'rgba(255,255,255,0.8)' : 'var(--wh-text-secondary)' }}>{tab.desc}</span>
                        </button>
                    ))}
                </div>

                <button type="button" onClick={() => setShowHabilidadesGuide(true)} className="guide-btn skills" style={{ margin: 0 }}>
                    <span>📖</span><span>Guia das Habilidades</span>
                </button>
            </div>

            <HabilidadesGuideModal isOpen={showHabilidadesGuide} onClose={() => setShowHabilidadesGuide(false)} />

            {/* Conteúdo de RAG (Conhecimento Externo) */}
            {activeSubTab === 'rag' && <RagKnowledgeSection globalVars={globalVars} />}

            {/* Conteúdo de Ações & Ferramentas (API) */}
            {activeSubTab === 'actions' && <ActionsToolsSection />}
        </div>
    );
};

export default TabHabilidades;

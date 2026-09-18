import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles/Base.css';
import './styles/Navigation.css';
import './styles/Forms.css';
import './styles/Modals.css';
import './styles/Specialized.css';
import './styles/Overlay.css';
import './styles/Footer.css';
import './styles/Responsive.css';
import { ConfigProvider, useConfig } from './ConfigContext';
import { useConfigData } from './hooks/useConfigData';
import { useConfigSave } from './hooks/useConfigSave';

import TabGeral from './components/TabGeral';
import TabPrompts from './components/TabPrompts';
import TabHabilidades from './components/TabHabilidades';
import TabSeguranca from './components/TabSeguranca';
import TabWhitelabel from './components/TabWhitelabel';
import TabVersoes from './components/TabVersoes';
import TabSemanticCache from './components/TabSemanticCache';
import TabQuestionFunnels from './components/TabQuestionFunnels';

const ConfigPanelContent = ({ agentId, onClose, onSaveSuccess }) => {
    const {
        activeTab, setActiveTab,
        isNew, validationErrors,
        status, isSaving, isLoadingData,
        navigate, name, id
    } = useConfig();

    // Use custom hooks for data fetching and saving
    useConfigData(agentId);
    const { handleSave } = useConfigSave(onClose, onSaveSuccess);

    const tabs = [
        { id: 'geral', label: 'Geral', icon: '⚙️' },
        { id: 'prompts', label: 'Editor Prompt', icon: '💬' },
        { id: 'habilidades', label: 'Habilidades', icon: '⚡' },
        { id: 'question_funnels', label: 'Funis por Dúvida', icon: '🎯' },
        { id: 'seguranca', label: 'Segurança', icon: '🛡️' },
        { id: 'cache', label: 'Respostas Aprovadas (Cache)', icon: '⚡' },
        { id: 'whitelabel', label: 'Whitelabel', icon: '🎨' },
        { id: 'versoes', label: 'Versões', icon: '🕒' }
    ];

    if (isLoadingData) {
        return (
            <div className="saving-overlay">
                <div className="saving-card">
                    <div className="saving-spinner-wrapper">
                        <div className="saving-spinner"></div>
                        <div className="saving-icon">🤖</div>
                    </div>
                    <h3>Carregando Agente</h3>
                    <p>Estamos preparando todas as ferramentas e memórias do seu agente. Por favor, aguarde um momento...</p>
                    <div className="saving-progress-bar">
                        <div className="saving-progress-fill"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="config-panel-container">
            {/* Top Navigation Bar */}
            {!isNew && (
                <div className="config-header">
                    <button onClick={() => navigate('/')} className="header-nav-btn">
                        ← Voltar para Agentes
                    </button>
                    
                    <div className="agent-identity">
                        <span>Configurações do</span>
                        <h2>{name || 'Carregando...'}</h2>
                    </div>

                    <button onClick={() => navigate(`/playground?agentId=${id}`)} className="header-nav-btn primary">
                        💬 Ir para o Chat
                    </button>
                </div>
            )}

            {/* Header / Tabs */}
            <div className="tab-navigation">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content-area">
                {activeTab === 'geral' && <TabGeral />}
                {activeTab === 'prompts' && <TabPrompts />}
                {activeTab === 'habilidades' && <TabHabilidades />}
                {activeTab === 'question_funnels' && <TabQuestionFunnels />}
                {activeTab === 'seguranca' && <TabSeguranca />}
                {activeTab === 'cache' && <TabSemanticCache />}
                {activeTab === 'whitelabel' && <TabWhitelabel />}
                {activeTab === 'versoes' && <TabVersoes />}
            </div>

            {/* Validation & Save Actions */}
            {activeTab !== 'versoes' && (
                <div className="config-footer">
                    {validationErrors.length > 0 && (
                        <div className="validation-alert">
                            <span className="alert-title">⚠️ Para {isNew ? 'criar' : 'salvar'}, corrija:</span>
                            <ul className="alert-list">
                                {validationErrors.map((err, i) => (
                                    <li key={i}>{err === 'nome' ? 'O agente precisa ter um nome.' : 'Selecione os modelos necessários na aba Geral.'}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="footer-actions">
                        <button type="button" onClick={handleSave} className="save-button" disabled={isSaving}>
                            {isSaving ? '⏳ Salvando...' : isNew ? '✨ Criar Agente' : '💾 Salvar Alterações'}
                        </button>
                    </div>
                </div>
            )}

            {/* Status Message */}
            {status && (
                <div className={`status-message ${status.includes('Erro') ? 'error' : 'success'}`}>
                    {status}
                </div>
            )}

            {/* Saving Overlay */}
            {isSaving && (
                <div className="saving-overlay">
                    <div className="saving-card">
                        <div className="saving-spinner-wrapper">
                            <div className="saving-spinner"></div>
                            <div className="saving-icon">💾</div>
                        </div>
                        <h3>Salvando Configurações</h3>
                        <p>Estamos processando as alterações e otimizando o seu agente. Por favor, aguarde um momento...</p>
                        <div className="saving-progress-bar">
                            <div className="saving-progress-fill"></div>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

const ConfigPanel = (props) => (
    <ConfigProvider>
        <ConfigPanelContent {...props} />
    </ConfigProvider>
);

export default ConfigPanel;

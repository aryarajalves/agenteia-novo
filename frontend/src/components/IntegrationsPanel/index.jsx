import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import WebhookManager from '../WebhookManager/index';
import IntegrationsGuide from './components/IntegrationsGuide';
import GoogleCalendarCard from './components/GoogleCalendarCard';
import WhatsAppCard from './components/WhatsAppCard';
import { ProvisionModal, ErrorModal } from './components/Modals';

const IntegrationsPanel = () => {
    const [googleConnected, setGoogleConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [provisionModal, setProvisionModal] = useState(null);
    const [errorModal, setErrorModal] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [activeView, setActiveView] = useState('list'); // 'list' or 'whatsapp'
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'productivity', 'communication'

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get(`/integrations/google/status`);
                const data = await res.json();
                setGoogleConnected(data.connected);
            } catch (err) {
                console.error("Error checking Google status:", err);
            } finally {
                setIsLoading(false);
            }
        };
        checkStatus();
    }, []);

    const handleConnectGoogle = async () => {
        try {
            const res = await api.get(`/integrations/google/auth-url`);
            const data = await res.json();

            if (data.auth_url) {
                window.location.href = data.auth_url;
            } else {
                setErrorModal({
                    title: "Atenção: Configuração Necessária",
                    message: "Não conseguimos gerar o link de autorização. Certifique-se de que as credenciais do Google estejam no seu .env.",
                    icon: "⚠️"
                });
            }
        } catch (err) {
            setErrorModal({
                title: "Falha de Comunicação",
                message: "Não foi possível conectar ao servidor backend.",
                icon: "🚫"
            });
        }
    };

    const handleProvisionTools = async () => {
        try {
            const res = await api.post(`/integrations/google/provision-tools`);
            const data = await res.json();
            setProvisionModal(data);
        } catch (err) {
            setErrorModal({
                title: "Erro de Sincronização",
                message: "Não foi possível atualizar o catálogo de ferramentas.",
                icon: "🔄"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="config-panel">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Carregando integrações...</p>
                </div>
            </div>
        );
    }

    if (activeView === 'whatsapp') {
        return (
            <div className="config-panel fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveView('list')}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8', padding: '8px 16px', borderRadius: '10px',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <span>←</span> Voltar para Integrações
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        className="guide-btn-mini"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            color: '#a5b4fc', borderRadius: '10px', padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        <span>📖</span> Guia
                    </button>
                </div>
                <WebhookManager />
                <IntegrationsGuide showGuide={showGuide} setShowGuide={setShowGuide} />
            </div>
        );
    }

    return (
        <div className="config-panel fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="panel-title" style={{ margin: 0 }}>🔌 Integrações Globais</h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '4px' }}>
                        Configure integrações que valem para todos os seus agentes.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowGuide(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#a5b4fc', borderRadius: '10px',
                        padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
                    }}
                >
                    <span>📖</span><span>Guia das Integrações</span>
                </button>
            </div>

            {/* BARRA DE NAVEGAÇÃO POR ABAS */}
            <div className="integrations-tabs-nav">
                <button
                    type="button"
                    data-testid="integrations-tab-all"
                    className={`integrations-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span>🌟</span>
                    <span>Todas</span>
                    <span className="integrations-tab-badge">2</span>
                </button>
                <button
                    type="button"
                    data-testid="integrations-tab-productivity"
                    className={`integrations-tab-btn ${activeTab === 'productivity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('productivity')}
                >
                    <span>📅</span>
                    <span>Produtividade & Agendas</span>
                    {googleConnected && <span className="integrations-tab-badge connected">✓ Conectado</span>}
                </button>
                <button
                    type="button"
                    data-testid="integrations-tab-communication"
                    className={`integrations-tab-btn ${activeTab === 'communication' ? 'active' : ''}`}
                    onClick={() => setActiveTab('communication')}
                >
                    <span>💬</span>
                    <span>Comunicação & Mensageria</span>
                    <span className="integrations-tab-badge">ZapJords</span>
                </button>
            </div>

            {/* CARDS DAS INTEGRAÇÕES FILTRADOS POR ABA */}
            {(activeTab === 'all' || activeTab === 'productivity') && (
                <div className="fade-in">
                    <GoogleCalendarCard 
                        googleConnected={googleConnected} 
                        onConnect={handleConnectGoogle} 
                        onProvision={handleProvisionTools} 
                    />
                </div>
            )}

            {(activeTab === 'all' || activeTab === 'communication') && (
                <div className="fade-in">
                    <WhatsAppCard onConfigClick={() => setActiveView('whatsapp')} />
                </div>
            )}

            <IntegrationsGuide showGuide={showGuide} setShowGuide={setShowGuide} />
            
            <ProvisionModal data={provisionModal} onClose={() => setProvisionModal(null)} />
            <ErrorModal data={errorModal} onClose={() => setErrorModal(null)} />
        </div>
    );
};

export default IntegrationsPanel;

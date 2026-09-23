import React from 'react';
import {
    ZapvoiceSubTabsNav,
    ZapvoiceCredentialsSubTab,
    ZapvoiceLabelsSubTab,
    ZapvoiceHandoffSubTab,
    ZapvoiceProjectSubTab
} from './ZapvoiceTabModules';

const ZapvoiceTab = ({
    safeEditForm,
    setEditForm,
    zapvoiceSubTab,
    setZapvoiceSubTab,
    showToken,
    setShowToken,
    labelsList = [],
    labelsLoading = false,
    fetchChatwootLabels
}) => {
    return (
        <div className="tab-pane animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Sub-Abas Superiores da Aba ZapVoice */}
            <ZapvoiceSubTabsNav 
                zapvoiceSubTab={zapvoiceSubTab} 
                setZapvoiceSubTab={setZapvoiceSubTab} 
            />

            {/* SUB-ABA 1: CREDENCIAIS & CONEXÃO */}
            {zapvoiceSubTab === 'credenciais' && (
                <ZapvoiceCredentialsSubTab
                    safeEditForm={safeEditForm}
                    setEditForm={setEditForm}
                    showToken={showToken}
                    setShowToken={setShowToken}
                />
            )}

            {/* SUB-ABA 2: ETIQUETAS AUTOMÁTICAS */}
            {zapvoiceSubTab === 'etiquetas' && (
                <ZapvoiceLabelsSubTab
                    safeEditForm={safeEditForm}
                    setEditForm={setEditForm}
                    labelsList={labelsList}
                    labelsLoading={labelsLoading}
                    fetchChatwootLabels={fetchChatwootLabels}
                />
            )}

            {/* SUB-ABA 3: SUPORTE & HANDOFF */}
            {zapvoiceSubTab === 'handoff' && (
                <ZapvoiceHandoffSubTab
                    safeEditForm={safeEditForm}
                    setEditForm={setEditForm}
                    labelsList={labelsList}
                />
            )}

            {/* SUB-ABA 4: ASSISTENTE DE PROJETO */}
            {zapvoiceSubTab === 'projeto' && (
                <ZapvoiceProjectSubTab
                    safeEditForm={safeEditForm}
                    setEditForm={setEditForm}
                    labelsList={labelsList}
                />
            )}
        </div>
    );
};

export default ZapvoiceTab;

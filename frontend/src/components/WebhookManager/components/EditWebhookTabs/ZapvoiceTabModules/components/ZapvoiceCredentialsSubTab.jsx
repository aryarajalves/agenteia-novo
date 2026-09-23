import React from 'react';

const ZapvoiceCredentialsSubTab = ({
    safeEditForm,
    setEditForm,
    showToken,
    setShowToken
}) => {
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0ea5e922', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🔑</div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Integração ZapVoice</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group-premium">
                    <label className="premium-label">URL do ZapVoice</label>
                    <input 
                        type="text" 
                        placeholder="Ex: https://api.zapvoice.com" 
                        value={safeEditForm.zapvoice_url || ''} 
                        onChange={e => setEditForm({ ...safeEditForm, zapvoice_url: e.target.value })} 
                        className="premium-input" 
                    />
                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                        URL da API da sua instância do ZapVoice.
                    </p>
                </div>
                <div className="form-group-premium">
                    <label className="premium-label">API Token / Token de Acesso</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                            type={showToken ? "text" : "password"} 
                            placeholder="Token do ZapVoice" 
                            value={safeEditForm.zapvoice_api_token || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, zapvoice_api_token: e.target.value })} 
                            className="premium-input" 
                            style={{ paddingRight: '2.5rem', width: '100%' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={showToken ? "Ocultar Token" : "Mostrar Token"}
                        >
                            {showToken ? "👁️" : "🙈"}
                        </button>
                    </div>
                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                        Token secreto de autenticação da API.
                    </p>
                </div>
                <div className="form-group-premium">
                    <label className="premium-label">ID do Cliente (Client ID)</label>
                    <input 
                        type="text" 
                        placeholder="Ex: client_123" 
                        value={safeEditForm.zapvoice_client_id || ''} 
                        onChange={e => setEditForm({ ...safeEditForm, zapvoice_client_id: e.target.value })} 
                        className="premium-input" 
                    />
                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                        Esse ID é usado para saber qual é o ID do cliente do ZapVoice que estamos utilizando neste exato momento.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ZapvoiceCredentialsSubTab;

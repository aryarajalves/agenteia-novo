import React from 'react';
import ReactDOM from 'react-dom';

const SimulatorSearchLoadingModal = ({ isOpen, query = '', config = {} }) => {
    if (!isOpen) return null;

    const activeFilters = [];
    if (config?.translation) activeFilters.push('Tradução');
    if (config?.multiQuery) activeFilters.push('Multi-Query');
    if (config?.rerank) activeFilters.push('Rerank IA');
    if (config?.agenticEval) activeFilters.push('Avaliação Agêntica');
    if (config?.parentExpansion) activeFilters.push('Expansão de Contexto');

    return ReactDOM.createPortal(
        <div 
            className="sim-search-modal-overlay" 
            data-testid="sim-search-loading-modal"
            role="dialog"
            aria-modal="true"
        >
            <div className="sim-search-modal-card" onClick={e => e.stopPropagation()}>
                {/* Ícone de busca com pulso IA */}
                <div className="sim-search-radar-wrapper">
                    <div className="sim-search-radar-pulse"></div>
                    <div className="sim-search-radar-inner">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="sim-search-icon">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>

                <h3 className="sim-search-modal-title">
                    Buscando na Base de Conhecimento...
                </h3>

                {query && (
                    <div className="sim-search-query-badge" data-testid="sim-search-loading-query">
                        <span className="sim-search-query-quote">"</span>
                        <span className="sim-search-query-text">{query}</span>
                        <span className="sim-search-query-quote">"</span>
                    </div>
                )}

                <p className="sim-search-modal-subtitle">
                    Localizando os itens mais relevantes via busca semântica vetorial e avaliando filtros de IA.
                </p>

                {/* Filtros de IA Ativos */}
                {activeFilters.length > 0 && (
                    <div className="sim-search-active-filters" data-testid="sim-search-active-filters">
                        <span className="sim-search-filters-label">Processando com filtros:</span>
                        <div className="sim-search-filter-chips">
                            {activeFilters.map((f, idx) => (
                                <span key={idx} className="sim-search-filter-chip">
                                    ⚡ {f}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Barra de progresso animada */}
                <div className="sim-search-progress-track">
                    <div className="sim-search-progress-bar"></div>
                </div>
            </div>

            <style>{`
                .sim-search-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 9, 20, 0.78);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 9999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: simModalFadeIn 0.2s ease-out;
                }

                .sim-search-modal-card {
                    background: linear-gradient(145deg, #131c31 0%, #0a0f1d 100%);
                    border: 1px solid rgba(99, 102, 241, 0.35);
                    border-radius: 28px;
                    width: 100%;
                    max-width: 440px;
                    padding: 36px 30px 32px;
                    box-shadow: 0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.2);
                    text-align: center;
                    animation: simModalPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    overflow: hidden;
                }

                .sim-search-radar-wrapper {
                    position: relative;
                    width: 84px;
                    height: 84px;
                    margin: 0 auto 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sim-search-radar-pulse {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0) 70%);
                    animation: simPulseRing 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
                }

                .sim-search-radar-inner {
                    position: relative;
                    width: 68px;
                    height: 68px;
                    border-radius: 22px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(129, 140, 248, 0.1) 100%);
                    border: 1.5px solid rgba(99, 102, 241, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
                }

                .sim-search-icon {
                    color: #a5b4fc;
                    animation: simIconBob 1.6s ease-in-out infinite;
                }

                .sim-search-modal-title {
                    color: #ffffff;
                    font-size: 1.35rem;
                    font-weight: 800;
                    margin: 0 0 12px;
                    letter-spacing: -0.01em;
                }

                .sim-search-query-badge {
                    display: inline-flex;
                    align-items: center;
                    max-width: 100%;
                    background: rgba(99, 102, 241, 0.12);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 12px;
                    padding: 6px 14px;
                    margin-bottom: 14px;
                    color: #c7d2fe;
                    font-size: 0.88rem;
                    font-weight: 600;
                    word-break: break-word;
                }

                .sim-search-query-quote {
                    color: #818cf8;
                    font-size: 1.1rem;
                    line-height: 1;
                    margin: 0 2px;
                }

                .sim-search-query-text {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 320px;
                }

                .sim-search-modal-subtitle {
                    color: #94a3b8;
                    font-size: 0.85rem;
                    line-height: 1.55;
                    margin: 0 0 18px;
                    padding: 0 10px;
                }

                .sim-search-active-filters {
                    margin-bottom: 20px;
                    padding: 10px 12px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                }

                .sim-search-filters-label {
                    display: block;
                    font-size: 0.72rem;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 700;
                    margin-bottom: 6px;
                }

                .sim-search-filter-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    justify-content: center;
                }

                .sim-search-filter-chip {
                    font-size: 0.72rem;
                    font-weight: 600;
                    background: rgba(34, 197, 94, 0.12);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    color: #4ade80;
                    padding: 2px 8px;
                    border-radius: 6px;
                }

                .sim-search-progress-track {
                    width: 100%;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 999px;
                    overflow: hidden;
                    position: relative;
                }

                .sim-search-progress-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 40%;
                    background: linear-gradient(90deg, #6366f1, #22c55e);
                    border-radius: 999px;
                    animation: simProgressSlide 1.4s ease-in-out infinite;
                }

                @keyframes simModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes simModalPop {
                    from { opacity: 0; transform: scale(0.92) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                @keyframes simPulseRing {
                    0% { transform: scale(0.85); opacity: 0.8; }
                    50% { transform: scale(1.35); opacity: 0.2; }
                    100% { transform: scale(1.6); opacity: 0; }
                }

                @keyframes simIconBob {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-4px) scale(1.05); }
                }

                @keyframes simProgressSlide {
                    0% { left: -40%; width: 40%; }
                    50% { left: 30%; width: 50%; }
                    100% { left: 100%; width: 40%; }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default SimulatorSearchLoadingModal;

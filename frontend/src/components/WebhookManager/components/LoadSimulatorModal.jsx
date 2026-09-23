import React from 'react';
import {
    useLoadSimulator,
    LoadSimulatorHeader,
    LoadSimulatorForm,
    LoadSimulatorProgress,
    LoadSimulatorResults
} from './LoadSimulatorModal/index';

const LoadSimulatorModal = ({ webhook, onClose, onFinish, onViewLeads }) => {
    const {
        contactCount,
        setContactCount,
        sampleMessage,
        setSampleMessage,
        concurrencyRate,
        setConcurrencyRate,
        respectDelay,
        setRespectDelay,
        simulating,
        progress,
        results,
        setResults,
        errorMsg,
        handleRunSimulation
    } = useLoadSimulator({ webhook, onFinish });

    return (
        <div className="premium-modal-overlay">
            <div 
                className="premium-modal-content"
                style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <LoadSimulatorHeader 
                    webhook={webhook} 
                    onClose={onClose} 
                    simulating={simulating} 
                />

                {/* Conteúdo Principal */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Formulário de Configuração */}
                    {!simulating && !results && (
                        <LoadSimulatorForm
                            contactCount={contactCount}
                            setContactCount={setContactCount}
                            sampleMessage={sampleMessage}
                            setSampleMessage={setSampleMessage}
                            concurrencyRate={concurrencyRate}
                            setConcurrencyRate={setConcurrencyRate}
                            respectDelay={respectDelay}
                            setRespectDelay={setRespectDelay}
                            webhook={webhook}
                            errorMsg={errorMsg}
                            onRunSimulation={handleRunSimulation}
                        />
                    )}

                    {/* Estado de Progresso Animado */}
                    {simulating && (
                        <LoadSimulatorProgress 
                            contactCount={contactCount} 
                            progress={progress} 
                        />
                    )}

                    {/* Painel de Resultados do Benchmark */}
                    {results && !simulating && (
                        <LoadSimulatorResults
                            results={results}
                            onResetResults={() => setResults(null)}
                            webhook={webhook}
                            onViewLeads={onViewLeads}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadSimulatorModal;

import React from 'react';

const ObjectionsControlPanel = ({
    agents,
    selectedAgentId,
    onSelectAgent,
    onRecalculate,
    loading,
    recalculating
}) => {
    return (
        <div className="objections-control-panel">
            <div className="agent-selector-wrapper">
                <span className="agent-selector-label">Agente Analisado:</span>
                <select
                    value={selectedAgentId}
                    onChange={(e) => onSelectAgent(e.target.value)}
                    className="agent-select"
                    disabled={loading || recalculating}
                >
                    {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                            🤖 {agent.name}
                        </option>
                    ))}
                </select>
            </div>

            <button
                className="objections-recalc-btn"
                onClick={onRecalculate}
                disabled={loading || recalculating || !selectedAgentId}
            >
                {recalculating ? (
                    <>
                        <div className="recalc-spinner"></div>
                        <span>Recalculando...</span>
                    </>
                ) : (
                    <>
                        <span>🔄</span>
                        <span>Recalcular/Atualizar Ranking</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default ObjectionsControlPanel;

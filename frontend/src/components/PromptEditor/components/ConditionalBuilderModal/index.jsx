import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { getUsedVars, getEvaluationResult } from './utils/conditionalEvaluator';
import VariableSelectionStep from './components/VariableSelectionStep';
import MainConditionSection from './components/MainConditionSection';
import ElifBlocksSection from './components/ElifBlocksSection';
import ElseSection from './components/ElseSection';
import LivePreviewSection from './components/LivePreviewSection';
import SimulatorSection from './components/SimulatorSection';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import ConditionalModalFooter from './components/ConditionalModalFooter';

/**
 * ConditionalBuilderModal
 * Modal visual do construtor de condicionais modularizado.
 * Suporta dois modos:
 *   - Inserção (editMode=false): botão "✨ Inserir no Prompt"
 *   - Edição (editMode=true): botão "✅ Atualizar Condicional" com header diferente
 */
export default function ConditionalBuilderModal({
    show,
    onClose,
    onSave,
    onDelete,
    editMode = false,
    builder,
    globalVarsList = []
}) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [simulatedValues, setSimulatedValues] = useState({});

    useEffect(() => {
        if (!show) {
            setShowDeleteConfirm(false);
        }
    }, [show]);

    if (!show) return null;

    const {
        selectedVar, setSelectedVar,
        condOperator, setCondOperator,
        condValue, setCondValue,
        addAndCondition, setAddAndCondition,
        andVar, setAndVar,
        andOperator, setAndOperator,
        andValue, setAndValue,
        condTrueText, setCondTrueText,
        condFalseText, setCondFalseText,
        elifsList,
        condTitle, setCondTitle,
        handleStartConfigure,
        handleAddElif,
        handleRemoveElif,
        handleUpdateElif,
        renderValueInput,
        getGeneratedSnippet,
        temporalVars,
        allVars
    } = builder;

    const usedVars = getUsedVars({ selectedVar, addAndCondition, andVar, elifsList });

    const evaluationResult = getEvaluationResult({
        selectedVar,
        simulatedValues,
        condOperator,
        condValue,
        addAndCondition,
        andVar,
        andOperator,
        andValue,
        condTrueText,
        elifsList,
        condFalseText
    });

    return ReactDOM.createPortal(
        <div className="cond-modal-overlay fade-in">
            <div className={`cond-modal-card ${selectedVar ? 'configuring' : ''} ${editMode ? 'edit-mode' : ''}`}>
                <header className="modal-header">
                    {editMode ? (
                        <h3>✏️ {selectedVar ? 'Editando Condicional' : 'Selecione a Variável'}</h3>
                    ) : (
                        <h3>🔀 {selectedVar ? 'Configurar Condicional' : 'Assistente de Condicionais'}</h3>
                    )}
                    {editMode && !selectedVar && (
                        <span className="edit-mode-badge">Modo Edição</span>
                    )}
                </header>

                <div className="modal-body custom-scrollbar">
                    {!selectedVar ? (
                        <VariableSelectionStep
                            globalVarsList={globalVarsList}
                            temporalVars={temporalVars}
                            onSelectVar={handleStartConfigure}
                        />
                    ) : (
                        <div className="interactive-configurer fade-in">
                            <MainConditionSection
                                selectedVar={selectedVar}
                                condTitle={condTitle}
                                setCondTitle={setCondTitle}
                                condOperator={condOperator}
                                setCondOperator={setCondOperator}
                                condValue={condValue}
                                setCondValue={setCondValue}
                                addAndCondition={addAndCondition}
                                setAddAndCondition={setAddAndCondition}
                                andVar={andVar}
                                setAndVar={setAndVar}
                                andOperator={andOperator}
                                setAndOperator={setAndOperator}
                                andValue={andValue}
                                setAndValue={setAndValue}
                                allVars={allVars}
                                renderValueInput={renderValueInput}
                                condTrueText={condTrueText}
                                setCondTrueText={setCondTrueText}
                            />

                            <ElifBlocksSection
                                elifsList={elifsList}
                                handleAddElif={handleAddElif}
                                handleRemoveElif={handleRemoveElif}
                                handleUpdateElif={handleUpdateElif}
                                allVars={allVars}
                                renderValueInput={renderValueInput}
                            />

                            <ElseSection
                                condFalseText={condFalseText}
                                setCondFalseText={setCondFalseText}
                            />

                            <LivePreviewSection
                                snippet={getGeneratedSnippet()}
                            />

                            <SimulatorSection
                                usedVars={usedVars}
                                simulatedValues={simulatedValues}
                                setSimulatedValues={setSimulatedValues}
                                renderValueInput={renderValueInput}
                                evaluationResult={evaluationResult}
                            />
                        </div>
                    )}
                </div>

                <ConditionalModalFooter
                    selectedVar={selectedVar}
                    editMode={editMode}
                    onClose={onClose}
                    onBack={() => setSelectedVar(null)}
                    onSave={onSave}
                    onDeleteClick={() => setShowDeleteConfirm(true)}
                />
            </div>

            <DeleteConfirmDialog
                show={showDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    onDelete();
                    setShowDeleteConfirm(false);
                }}
            />
        </div>,
        document.body
    );
}

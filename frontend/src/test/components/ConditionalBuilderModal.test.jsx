import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConditionalBuilderModal from '../../components/PromptEditor/components/ConditionalBuilderModal';
import { evaluateComparison, getUsedVars, getEvaluationResult } from '../../components/PromptEditor/components/ConditionalBuilderModal/utils/conditionalEvaluator';

describe('conditionalEvaluator Utilities', () => {
    it('deve avaliar comparações numéricas corretamente', () => {
        expect(evaluateComparison('10', '==', '10')).toBe(true);
        expect(evaluateComparison('10', '!=', '5')).toBe(true);
        expect(evaluateComparison('15', '>', '10')).toBe(true);
        expect(evaluateComparison('5', '<', '10')).toBe(true);
        expect(evaluateComparison('10', '>=', '10')).toBe(true);
        expect(evaluateComparison('9', '<=', '10')).toBe(true);
        expect(evaluateComparison('5', '>', '10')).toBe(false);
    });

    it('deve avaliar comparações de texto de forma case-insensitive', () => {
        expect(evaluateComparison('Segunda', '==', 'segunda')).toBe(true);
        expect(evaluateComparison('Terça', '!=', 'segunda')).toBe(true);
    });

    it('deve extrair variáveis usadas na condicional', () => {
        const vars = getUsedVars({
            selectedVar: 'dia_semana',
            addAndCondition: true,
            andVar: 'hora_atual',
            elifsList: [{ variable: 'tipo_cliente' }]
        });
        expect(vars).toEqual(['dia_semana', 'hora_atual', 'tipo_cliente']);
    });
});

describe('ConditionalBuilderModal Component', () => {
    let mockBuilder;

    beforeEach(() => {
        mockBuilder = {
            selectedVar: 'dia_semana',
            setSelectedVar: vi.fn(),
            condOperator: '==',
            setCondOperator: vi.fn(),
            condValue: 'sexta-feira',
            setCondValue: vi.fn(),
            addAndCondition: false,
            setAddAndCondition: vi.fn(),
            andVar: '',
            setAndVar: vi.fn(),
            andOperator: '==',
            setAndOperator: vi.fn(),
            andValue: '',
            setAndValue: vi.fn(),
            condTrueText: 'Hoje é sexta-feira! 🎉',
            setCondTrueText: vi.fn(),
            condFalseText: 'Não é sexta-feira.',
            setCondFalseText: vi.fn(),
            elifsList: [
                { id: 1, variable: 'dia_semana', operator: '==', value: 'sábado', trueText: 'Final de semana!' }
            ],
            condTitle: 'Condicional de Teste',
            setCondTitle: vi.fn(),
            handleStartConfigure: vi.fn(),
            handleAddElif: vi.fn(),
            handleRemoveElif: vi.fn(),
            handleUpdateElif: vi.fn(),
            renderValueInput: (v, val, setVal, id) => {
                if (v === 'dia_semana') {
                    const dias = [
                        'segunda-feira', 'terça-feira', 'quarta-feira',
                        'quinta-feira', 'sexta-feira', 'sábado', 'domingo',
                    ];
                    return (
                        <select id={id} value={val} onChange={(e) => setVal(e.target.value)}>
                            <option value="">Selecione o dia...</option>
                            {dias.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    );
                }
                return <input id={id} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Definir valor..." />;
            },
            getGeneratedSnippet: () => '# Condicional de Teste\n[IF:dia_semana == sexta-feira]\nHoje é sexta-feira! 🎉\n[ELIF:dia_semana == sábado]\nFinal de semana!\n[ELSE]\nNão é sexta-feira.\n[/IF]',
            temporalVars: [{ key: 'dia_semana', desc: 'Dia da semana' }],
            allVars: [{ key: 'dia_semana' }, { key: 'nome_cliente' }],
        };
    });

    it('deve renderizar a seleção de variáveis quando nenhuma estiver selecionada', () => {
        mockBuilder.selectedVar = null;
        render(
            <ConditionalBuilderModal
                show={true}
                onClose={() => {}}
                onSave={() => {}}
                onDelete={() => {}}
                editMode={false}
                builder={mockBuilder}
                globalVarsList={[{ id: 1, key: 'nome_cliente', description: 'Nome do lead' }]}
            />
        );

        expect(screen.getByText(/Variáveis Globais/i)).toBeInTheDocument();
        expect(screen.getByText('nome_cliente')).toBeInTheDocument();
        expect(screen.getByText(/Variáveis Temporais/i)).toBeInTheDocument();

        // Clica para configurar
        const configBtn = screen.getAllByText('⚙️ Configurar')[0];
        fireEvent.click(configBtn);
        expect(mockBuilder.handleStartConfigure).toHaveBeenCalledWith('nome_cliente');
    });

    it('deve renderizar a seção de simulador e simular resultado esperado', () => {
        render(
            <ConditionalBuilderModal
                show={true}
                onClose={() => {}}
                onSave={() => {}}
                onDelete={() => {}}
                editMode={true}
                builder={mockBuilder}
                globalVarsList={[]}
            />
        );

        expect(screen.getByText(/🧪 Simulador de Resultado/i)).toBeInTheDocument();
        const selectField = document.getElementById('sim-value-input-dia_semana');
        expect(selectField).toBeInTheDocument();

        const resultDiv = screen.getByTestId('expected-result');
        expect(resultDiv.textContent).toBe('Não é sexta-feira.');

        fireEvent.change(selectField, { target: { value: 'sexta-feira' } });
        expect(resultDiv.textContent).toBe('Hoje é sexta-feira! 🎉');

        fireEvent.change(selectField, { target: { value: 'sábado' } });
        expect(resultDiv.textContent).toBe('Final de semana!');
    });

    it('deve abrir o modal de confirmação de exclusão ao clicar em deletar condicional', () => {
        const onDeleteMock = vi.fn();
        render(
            <ConditionalBuilderModal
                show={true}
                onClose={() => {}}
                onSave={() => {}}
                onDelete={onDeleteMock}
                editMode={true}
                builder={mockBuilder}
                globalVarsList={[]}
            />
        );

        const deleteBtn = screen.getByText(/🗑️ Deletar Condicional/i);
        fireEvent.click(deleteBtn);

        expect(screen.getByText(/⚠️ Confirmar Exclusão/i)).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza de que deseja deletar esta condicional\?/i)).toBeInTheDocument();

        const confirmDeleteBtn = screen.getByText('Sim, Deletar');
        fireEvent.click(confirmDeleteBtn);

        expect(onDeleteMock).toHaveBeenCalled();
    });

    it('deve chamar onSave ao clicar em Atualizar Condicional no modo de edição', () => {
        const onSaveMock = vi.fn();
        render(
            <ConditionalBuilderModal
                show={true}
                onClose={() => {}}
                onSave={onSaveMock}
                onDelete={() => {}}
                editMode={true}
                builder={mockBuilder}
                globalVarsList={[]}
            />
        );

        const saveBtn = screen.getByText('✅ Atualizar Condicional');
        fireEvent.click(saveBtn);

        expect(onSaveMock).toHaveBeenCalled();
    });
});

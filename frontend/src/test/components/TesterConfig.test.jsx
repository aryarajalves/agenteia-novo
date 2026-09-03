import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TesterConfig from '../../components/ChatPlayground/components/Sidebar/TesterConfig';

const mockPersonas = {
    cynic: {
        name: 'O Cético 🧐',
        description: 'Um cliente que duvida de tudo e pede descontos impossíveis.'
    },
    buyer: {
        name: 'O Comprador Apressado ⚡',
        description: 'Quer comprar rápido mas exige resposta imediata.'
    }
};

describe('TesterConfig Component', () => {
    it('deve renderizar o switch principal do Stress Test', () => {
        render(
            <TesterConfig
                isTesterMode={false}
                setIsTesterMode={vi.fn()}
                setIsBattleMode={vi.fn()}
                testerPersona="cynic"
                setTesterPersona={vi.fn()}
                testerPersonas={mockPersonas}
                customPersona=""
                setCustomPersona={vi.fn()}
                customQuestionsMode={false}
                setCustomQuestionsMode={vi.fn()}
                customQuestions=""
                setCustomQuestions={vi.fn()}
                testerMessageCount={3}
                setTesterMessageCount={vi.fn()}
                testerDelay={2}
                setTesterDelay={vi.fn()}
                testerKnowsPrompt={false}
                setTesterKnowsPrompt={vi.fn()}
                testerIsDynamic={false}
                setTesterIsDynamic={vi.fn()}
                isTesterAutoRunning={false}
                isTesterRunning={false}
                toggleAutoTester={vi.fn()}
                loading={false}
            />
        );

        expect(screen.getByText('Stress Test (Tester AI)')).toBeInTheDocument();
        expect(screen.queryByText('PERSONA DO TESTADOR')).not.toBeInTheDocument();
    });

    it('deve renderizar controles avançados quando isTesterMode for true', () => {
        const setTesterMessageCount = vi.fn();
        const setTesterKnowsPrompt = vi.fn();
        const toggleAutoTester = vi.fn();

        render(
            <TesterConfig
                isTesterMode={true}
                setIsTesterMode={vi.fn()}
                setIsBattleMode={vi.fn()}
                testerPersona="cynic"
                setTesterPersona={vi.fn()}
                testerPersonas={mockPersonas}
                customPersona=""
                setCustomPersona={vi.fn()}
                customQuestionsMode={false}
                setCustomQuestionsMode={vi.fn()}
                customQuestions=""
                setCustomQuestions={vi.fn()}
                testerMessageCount={5}
                setTesterMessageCount={setTesterMessageCount}
                testerDelay={3}
                setTesterDelay={vi.fn()}
                testerKnowsPrompt={true}
                setTesterKnowsPrompt={setTesterKnowsPrompt}
                testerIsDynamic={false}
                setTesterIsDynamic={vi.fn()}
                isTesterAutoRunning={false}
                isTesterRunning={false}
                toggleAutoTester={toggleAutoTester}
                loading={false}
            />
        );

        expect(screen.getByText(/PERSONA DO TESTADOR/i)).toBeInTheDocument();
        expect(screen.getByText('Um cliente que duvida de tudo e pede descontos impossíveis.')).toBeInTheDocument();
        expect(screen.getByText('Modo White Box')).toBeInTheDocument();
        expect(screen.getByText('Modo Bipolar')).toBeInTheDocument();
        expect(screen.getByText('Roteiro de Perguntas Personalizadas')).toBeInTheDocument();
        
        const startBtn = screen.getByRole('button', { name: /Iniciar Stress Test/i });
        expect(startBtn).toBeInTheDocument();

        fireEvent.click(startBtn);
        expect(toggleAutoTester).toHaveBeenCalled();
    });

    it('deve alternar para o modo de Roteiro de Perguntas Personalizadas e exibir textarea de perguntas', () => {
        const setCustomQuestions = vi.fn();
        const setCustomQuestionsMode = vi.fn();

        render(
            <TesterConfig
                isTesterMode={true}
                setIsTesterMode={vi.fn()}
                setIsBattleMode={vi.fn()}
                testerPersona="cynic"
                setTesterPersona={vi.fn()}
                testerPersonas={mockPersonas}
                customPersona=""
                setCustomPersona={vi.fn()}
                customQuestionsMode={true}
                setCustomQuestionsMode={setCustomQuestionsMode}
                customQuestions={'Pergunta 1\nPergunta 2\nPergunta 3'}
                setCustomQuestions={setCustomQuestions}
                testerMessageCount={5}
                setTesterMessageCount={vi.fn()}
                testerDelay={2}
                setTesterDelay={vi.fn()}
                testerKnowsPrompt={false}
                setTesterKnowsPrompt={vi.fn()}
                testerIsDynamic={false}
                setTesterIsDynamic={vi.fn()}
                isTesterAutoRunning={false}
                isTesterRunning={false}
                toggleAutoTester={vi.fn()}
                loading={false}
            />
        );

        expect(screen.getByText(/PERGUNTAS \(1 POR LINHA\)/i)).toBeInTheDocument();
        expect(screen.getByText(/3 perguntas/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Digite ou cole suas perguntas aqui/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enviar Roteiro \(3\)/i })).toBeInTheDocument();
    });
});

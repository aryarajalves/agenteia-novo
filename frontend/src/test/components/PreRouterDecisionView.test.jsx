import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreRouterDecisionView from '../../components/ChatPlayground/components/MessageBubbleModules/PreRouterDecisionView';

const mockPreRouterData = {
    eh_saudacao: false,
    eh_agradecimento: false,
    eh_agradecimento_recorrente: false,
    eh_mensagem_automatica: false,
    precisa_esclarecimento: false,
    precisa_rag: true,
    id_agente_alvo: 36,
    perguntas_extraidas: 'Qual o valor do curso?',
    resumo_memorias: 'Usuário perguntou valores anteriores.'
};

describe('PreRouterDecisionView Component', () => {
    it('deve renderizar os badges com Não (False) e Sim (True) sem quebrar o layout', () => {
        render(
            <PreRouterDecisionView
                activePreRouterTab="classifications"
                rawData={mockPreRouterData}
            />
        );

        expect(screen.getByText('Filtros e Intenções do Usuário')).toBeInTheDocument();
        expect(screen.getByText('eh_agradecimento_recorrente')).toBeInTheDocument();

        const falseBadges = screen.getAllByText('Não (False)');
        expect(falseBadges.length).toBe(5);

        // Verificar se os badges têm white-space nowrap e flex-shrink
        falseBadges.forEach(badge => {
            expect(badge).toHaveStyle({ whiteSpace: 'nowrap', flexShrink: '0' });
        });

        const trueBadge = screen.getByText('Sim (True)');
        expect(trueBadge).toBeInTheDocument();
        expect(trueBadge).toHaveStyle({ whiteSpace: 'nowrap' });
    });

    it('deve renderizar aba de perguntas extraídas', () => {
        render(
            <PreRouterDecisionView
                activePreRouterTab="questions"
                rawData={mockPreRouterData}
            />
        );

        expect(screen.getByText('Perguntas Extraídas')).toBeInTheDocument();
        expect(screen.getByText('Qual o valor do curso?')).toBeInTheDocument();
    });

    it('deve renderizar aba de resumo de memórias', () => {
        render(
            <PreRouterDecisionView
                activePreRouterTab="memory"
                rawData={mockPreRouterData}
            />
        );

        expect(screen.getByText('Resumo de Memórias')).toBeInTheDocument();
        expect(screen.getByText('Usuário perguntou valores anteriores.')).toBeInTheDocument();
    });
});

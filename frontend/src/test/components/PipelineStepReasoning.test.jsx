import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import PipelineStepCard from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepCard';
import PipelineStepReasoning from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepReasoning';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        post: vi.fn()
    }
}));

describe('PipelineStepReasoning - Explicação e Passo a Passo da Resposta', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar o botão de explicar raciocínio no card de Resposta gerada pelo agente', () => {
        const step = {
            id: 'step_resp',
            title: '✅ Resposta gerada pelo agente',
            icon: '🤖',
            content: 'Maravilha!\n\nVocê já atua na área da estética ou está começando do zero?',
            timestampFormatted: '10:00:00'
        };

        render(<PipelineStepCard step={step} eventId={551} isAllCollapsed={false} />);

        const explainBtn = screen.getByTestId('explain-response-btn');
        expect(explainBtn).toBeInTheDocument();
        expect(explainBtn).toHaveTextContent(/Por que essa resposta\?/i);
    });

    it('deve chamar o endpoint /explain-response e renderizar a 1ª parte, pergunta e passo a passo', async () => {
        const mockReasoning = {
            summary: 'A IA acolheu com simpatia a resposta negativa do lead e formulou a pergunta de qualificação.',
            primeira_parte: {
                texto: 'Maravilha!',
                motivo: 'Regra 5 exigiu acolhimento simpático após o lead responder com negação.'
            },
            pergunta_conducao: {
                texto: 'Você já atua na área da estética ou está começando do zero?',
                motivo: 'Diretriz de condução do funil de qualificação.'
            },
            passo_a_passo: [
                'Lead respondeu Não tenho',
                'IA aplicou Regra de Continuidade',
                'Acolheu com Maravilha!',
                'Fez pergunta de qualificação'
            ],
            fatores: [
                { titulo: 'Regra 5 - Continuidade', explicacao: 'Evitou encerramento seco', relevancia: 'alta' }
            ]
        };

        api.post.mockResolvedValueOnce({
            json: async () => mockReasoning
        });

        const step = {
            id: 'step_resp',
            title: '✅ Resposta gerada pelo agente',
            icon: '🤖',
            content: 'Maravilha!\n\nVocê já atua na área da estética ou está começando do zero?',
            timestampFormatted: '10:00:00'
        };

        render(<PipelineStepCard step={step} eventId={551} isAllCollapsed={false} />);

        const explainBtn = screen.getByTestId('explain-response-btn');
        await act(async () => {
            fireEvent.click(explainBtn);
        });

        expect(api.post).toHaveBeenCalledWith('/webhooks/events/551/explain-response');

        await waitFor(() => {
            expect(screen.getByText(/A IA acolheu com simpatia/i)).toBeInTheDocument();
            expect(screen.getByText(/1ª Parte \(Acolhimento \/ Reação\)/i)).toBeInTheDocument();
            expect(screen.getByText(/"Maravilha!"/i)).toBeInTheDocument();
            expect(screen.getByText(/Própria Pergunta \/ Condução/i)).toBeInTheDocument();
            expect(screen.getByText(/"Você já atua na área da estética ou está começando do zero\?"/i)).toBeInTheDocument();
            expect(screen.getByText(/Linha de Raciocínio da IA \(Passo a Passo\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Regra 5 - Continuidade/i)).toBeInTheDocument();
        });
    });

    it('deve renderizar diretamente o diagnóstico quando já vier salvo no metadata', () => {
        const step = {
            id: 'step_resp_cached',
            title: '✅ Resposta gerada pelo agente',
            icon: '🤖',
            content: 'Perfeito! Qual seu email?',
            metadata: {
                reasoning: {
                    summary: 'Avançou para a etapa 2 do funil.',
                    primeira_parte: { texto: 'Perfeito!', motivo: 'Validação' },
                    pergunta_conducao: { texto: 'Qual seu email?', motivo: 'Etapa 2' },
                    passo_a_passo: ['Passo 1', 'Passo 2'],
                    fatores: []
                }
            }
        };

        render(<PipelineStepReasoning step={step} eventId={551} />);

        expect(screen.getByText(/Avançou para a etapa 2 do funil/i)).toBeInTheDocument();
        expect(screen.getByText(/✓ Diagnóstico Disponível/i)).toBeInTheDocument();
    });
});

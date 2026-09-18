import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TimelineView from '../../components/ChatPlayground/components/TimelineView';

describe('TimelineView Component', () => {
    it('renders null when debug is undefined', () => {
        const { container } = render(<TimelineView debug={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders WhatsApp Webhook, Pre-Router classification, improved message, and response steps', () => {
        const mockDebug = {
            pre_router: {
                mensagem_original: "oie",
                mensagem_melhorada: "Olá, gostaria de saber os horários de atendimento",
                tipo_mensagem: "Dúvida / Pergunta de Conhecimento",
                precisa_rag: true,
                precisa_ferramenta: false,
                _debug_prompt: "SYSTEM PROMPT MOCK"
            },
            full_prompt: ["msg1", "msg2"]
        };

        const onOpenDecision = vi.fn();
        const onOpenPrompt = vi.fn();

        render(
            <TimelineView
                debug={mockDebug}
                onOpenPreRouterDecision={onOpenDecision}
                onOpenPreRouterPrompt={onOpenPrompt}
            />
        );

        // Check Webhook step
        expect(screen.getByText('Entrada via WhatsApp / Webhook')).toBeInTheDocument();
        expect(screen.getByText('Mensagem recebida: "oie"')).toBeInTheDocument();

        // Check Pre-Router step
        expect(screen.getByText('Classificador Inicial (Pre-Router)')).toBeInTheDocument();
        expect(screen.getByText('🏷️ Dúvida / Pergunta de Conhecimento')).toBeInTheDocument();

        // Check Improved message step
        expect(screen.getByText('Melhoria de Mensagem (Pre-Router)')).toBeInTheDocument();
        expect(screen.getAllByText(/"oie"/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/"Olá, gostaria de saber os horários de atendimento"/)).toBeInTheDocument();

        // Check Decision Button
        const decisionBtn = screen.getByText('🧠 Ver Decisão do Pre-Router');
        fireEvent.click(decisionBtn);
        expect(onOpenDecision).toHaveBeenCalledTimes(1);

        // Check Prompt Button
        const promptBtn = screen.getByRole('button', { name: /ver prompt enviado/i });
        fireEvent.click(promptBtn);
        expect(onOpenPrompt).toHaveBeenCalledTimes(1);
    });

    it('renders programmatic shortcut with "Dispensado (Atalho)" and never "Automático"', () => {
        const shortcutDebug = {
            pre_router: {
                eh_saudacao: true,
                eh_agradecimento: false,
                precisa_esclarecimento: false,
                resposta_direta: "Olá! Como posso te ajudar?",
                perguntas_extraidas: null,
                lista_perguntas_extraidas: [],
                precisa_rag: false,
                tipo_mensagem: "Saudação (Atalho Programático)",
                _model_used: "shortcut-logic"
            }
        };

        render(<TimelineView debug={shortcutDebug} />);

        // Should display the greeting shortcut badge
        expect(screen.getByText('🏷️ Saudação (Atalho Programático)')).toBeInTheDocument();

        // Must display Dispensado (Atalho)
        expect(screen.getByText('📚 RAG: Dispensado (Atalho)')).toBeInTheDocument();

        // Must NEVER display Automático
        expect(screen.queryByText(/RAG: Automático/i)).toBeNull();

        // Step 6 RAG should also be labeled as Dispensado
        expect(screen.getByText('RAG Dispensado (Atalho Programático)')).toBeInTheDocument();

        // Step 9 should show Atalho Direto (Zero LLM)
        expect(screen.getByText('Atalho Direto (Zero LLM)')).toBeInTheDocument();
    });

    it('renders "Dispensado / Otimizado" when precisa_rag is false and not a shortcut', () => {
        const optimizedDebug = {
            pre_router: {
                tipo_mensagem: "Classificação de Intenção",
                precisa_rag: false,
                precisa_ferramenta: false
            }
        };

        render(<TimelineView debug={optimizedDebug} />);

        expect(screen.getByText('📚 RAG: Dispensado / Otimizado')).toBeInTheDocument();
        expect(screen.queryByText(/RAG: Automático/i)).toBeNull();
    });
});

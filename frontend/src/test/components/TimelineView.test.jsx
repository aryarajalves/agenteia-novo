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
        const promptBtn = screen.getByText('📄 Ver Prompt do Pre-Router');
        fireEvent.click(promptBtn);
        expect(onOpenPrompt).toHaveBeenCalledTimes(1);
    });
});

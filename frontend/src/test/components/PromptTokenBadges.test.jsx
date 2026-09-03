import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { estimateTokens, formatTokenCount } from '../../components/ChatPlayground/utils/tokenUtils';
import PromptModal from '../../components/ChatPlayground/components/MessageBubbleModules/PromptModal';
import ResolvedPromptView from '../../components/ChatPlayground/components/MessageBubbleModules/ResolvedPromptView';

describe('Prompt Token Badges (Raio-X)', () => {
    it('deve estimar corretamente a contagem de tokens com base no texto', () => {
        expect(estimateTokens('')).toBe(0);
        expect(estimateTokens(null)).toBe(0);
        
        const shortText = 'Você é um assistente virtual útil e amigável.';
        const tokens = estimateTokens(shortText);
        expect(tokens).toBeGreaterThan(5);
        expect(tokens).toBeLessThan(20);
        
        expect(formatTokenCount(1500)).toBe('1.500');
    });

    it('deve renderizar o badge de tokens no cabeçalho do PromptModal', () => {
        const mockModal = {
            title: 'Prompt Final do Sistema',
            content: 'Você é a Tarcira, assistente da clínica.\nInstruções de atendimento...',
            type: 'resolved_prompt'
        };

        render(
            <PromptModal
                activeModal={mockModal}
                onClose={() => {}}
                activePreRouterTab="classifications"
                setActivePreRouterTab={() => {}}
                activeResolvedPromptTab="static"
                setActiveResolvedPromptTab={() => {}}
            />
        );

        const badge = screen.getByTestId('modal-token-badge');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toMatch(/tokens/i);
    });

    it('deve renderizar o badge de tokens no ResolvedPromptView para o Prompt Estático', () => {
        const mockModal = {
            title: 'Prompt Final do Sistema',
            content: 'Você é a assistente Tarcira.\n\n### DIRETRIZES DE SEGURANÇA E ESTILO\nNão fale de concorrentes.',
            type: 'resolved_prompt'
        };

        render(
            <ResolvedPromptView
                activeResolvedPromptTab="static"
                activeModal={mockModal}
            />
        );

        expect(screen.getByText('Prompt Estático (Instruções e Identidade)')).toBeInTheDocument();
        expect(screen.getByText(/tokens/i)).toBeInTheDocument();
        expect(screen.getByText(/caracteres/i)).toBeInTheDocument();
    });
});

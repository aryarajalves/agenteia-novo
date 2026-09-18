import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LinkMessageBubble from '../../components/ChatPlayground/components/MessageBubbleModules/LinkMessageBubble';

describe('LinkMessageBubble Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve()),
            },
        });
    });

    it('deve renderizar card de checkout Kiwify com badge de segurança e link correto', () => {
        const msg = {
            role: 'assistant',
            content: 'https://pay.kiwify.com.br/VVme7C2?utm_source=whatsapp',
            isLink: true,
            isSplit: false
        };

        render(<LinkMessageBubble msg={msg} />);

        expect(screen.getByText('Checkout Oficial Kiwify')).toBeInTheDocument();
        expect(screen.getByText('Pagamento Seguro')).toBeInTheDocument();
        expect(screen.getByText('Plataforma de Pagamento Seguro')).toBeInTheDocument();
        expect(screen.getAllByText(/pay\.kiwify\.com\.br/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Acessar ↗')).toBeInTheDocument();

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', 'https://pay.kiwify.com.br/VVme7C2?utm_source=whatsapp');
        expect(anchor).toHaveAttribute('target', '_blank');
    });

    it('deve renderizar card para links de WhatsApp', () => {
        const msg = {
            role: 'assistant',
            content: 'https://wa.me/5511999999999?text=ola',
            isLink: true,
            isSplit: true
        };

        render(<LinkMessageBubble msg={msg} />);

        expect(screen.getByText('Contato via WhatsApp')).toBeInTheDocument();
        expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    });

    it('deve copiar a URL para a área de transferência ao clicar no botão Copiar', () => {
        const url = 'https://pay.kiwify.com.br/VVme7C2';
        const msg = {
            role: 'assistant',
            content: url,
            isLink: true,
            isSplit: false
        };

        render(<LinkMessageBubble msg={msg} />);

        const copyBtn = screen.getByTitle('Copiar URL');
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
        expect(screen.getByText('✓ Copiado')).toBeInTheDocument();
    });

    it('deve renderizar timestamp e barra de métricas (MessageMetaBar) quando msg.metrics estiver presente', () => {
        const msg = {
            role: 'assistant',
            content: 'https://pay.hotmart.com/Q107238351O?checkoutMode=10',
            isLink: true,
            isSplit: false,
            created_at: '2026-09-16T22:02:00.000Z',
            model_used: 'gpt-4o-mini',
            debug: { resolved_prompt: 'prompt do sistema de teste' },
            metrics: {
                tokens: 4500,
                input_tokens: 3500,
                output_tokens: 1000,
                cached_tokens: 2000,
                cost: 0.015,
                response_time_ms: 1200
            }
        };

        render(
            <LinkMessageBubble 
                msg={msg} 
                msgIndex={0} 
                isRegularUser={false} 
                handleThumbsUp={vi.fn()}
                handleThumbsDown={vi.fn()}
            />
        );

        // Verifica o card do Hotmart
        expect(screen.getByText('Checkout Hotmart')).toBeInTheDocument();
        
        // Verifica o timestamp
        expect(screen.getByTestId('assistant-timestamp')).toBeInTheDocument();

        // Verifica as métricas do MessageMetaBar
        expect(screen.getByText(/IN/)).toBeInTheDocument();
        expect(screen.getByText(/OUT/)).toBeInTheDocument();
        expect(screen.getByText(/TOTAL/)).toBeInTheDocument();
        expect(screen.getByText(/R\$\s*0\.0150/)).toBeInTheDocument();
        expect(screen.getByText(/Raio-X/)).toBeInTheDocument();
        expect(screen.getByTestId('btn-train-response')).toBeInTheDocument();
    });

    it('não deve renderizar MessageMetaBar se msg.metrics não estiver presente', () => {
        const msg = {
            role: 'assistant',
            content: 'https://pay.hotmart.com/Q107238351O?checkoutMode=10',
            isLink: true,
            isSplit: true,
            metrics: null
        };

        render(<LinkMessageBubble msg={msg} msgIndex={1} isRegularUser={false} />);

        expect(screen.getByText('Checkout Hotmart')).toBeInTheDocument();
        expect(screen.queryByTestId('assistant-timestamp')).not.toBeInTheDocument();
        expect(screen.queryByText('Raio-X')).not.toBeInTheDocument();
    });
});

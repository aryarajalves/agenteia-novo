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
});

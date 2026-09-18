import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ContextMemoryViewerModal from '../../components/WebhookManager/components/ContextMemoryViewerModal';

describe('ContextMemoryViewerModal', () => {
    const mockStepWithMessages = {
        id: 1,
        title: '🧠 Memória de Contexto',
        content: 'Injetadas 1 interações brutas (2 mensagens) como contexto.',
        metadata: {
            total_messages: 2,
            num_interactions: 1,
            context_window: 5,
            messages: [
                { role: 'user', content: 'Olá, gostaria de saber o valor do curso.' },
                { role: 'assistant', content: 'O curso custa R$ 497 à vista no PIX ou cartão.' }
            ]
        }
    };

    const mockLegacyStep = {
        id: 2,
        title: '🧠 Memória de Contexto',
        content: 'Injetadas 1 interações brutas (2 mensagens) como contexto.',
        metadata: {}
    };

    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    it('deve renderizar o cabeçalho e as mensagens com seus respectivos papéis', () => {
        render(<ContextMemoryViewerModal step={mockStepWithMessages} onClose={vi.fn()} />);

        expect(screen.getByText('Memória de Contexto Injetada')).toBeDefined();
        expect(screen.getByText('💬 2 mensagens')).toBeDefined();
        expect(screen.getByText(/Janela Máx: 10 msgs/)).toBeDefined();

        expect(screen.getByText(/Lead \/ Usuário/i)).toBeDefined();
        expect(screen.getByText(/Agente de IA/i)).toBeDefined();
        expect(screen.getByText('Olá, gostaria de saber o valor do curso.')).toBeDefined();
        expect(screen.getByText('O curso custa R$ 497 à vista no PIX ou cartão.')).toBeDefined();
    });

    it('deve filtrar mensagens por papel (Lead vs Agente)', () => {
        render(<ContextMemoryViewerModal step={mockStepWithMessages} onClose={vi.fn()} />);

        // Filtra por Lead
        fireEvent.click(screen.getByText(/👤 Lead/));
        expect(screen.getByText('Olá, gostaria de saber o valor do curso.')).toBeDefined();
        expect(screen.queryByText('O curso custa R$ 497 à vista no PIX ou cartão.')).toBeNull();

        // Filtra por Agente
        fireEvent.click(screen.getByText(/🤖 Agente/));
        expect(screen.queryByText('Olá, gostaria de saber o valor do curso.')).toBeNull();
        expect(screen.getByText('O curso custa R$ 497 à vista no PIX ou cartão.')).toBeDefined();

        // Volta para Todas
        fireEvent.click(screen.getByText(/Todas/));
        expect(screen.getByText('Olá, gostaria de saber o valor do curso.')).toBeDefined();
        expect(screen.getByText('O curso custa R$ 497 à vista no PIX ou cartão.')).toBeDefined();
    });

    it('deve filtrar mensagens via campo de busca', () => {
        render(<ContextMemoryViewerModal step={mockStepWithMessages} onClose={vi.fn()} />);

        const searchInput = screen.getByPlaceholderText('Buscar no histórico...');
        fireEvent.change(searchInput, { target: { value: 'PIX' } });

        expect(screen.queryByText('Olá, gostaria de saber o valor do curso.')).toBeNull();
        expect(screen.getByText('O curso custa R$ 497 à vista no PIX ou cartão.')).toBeDefined();
    });

    it('deve copiar todo o histórico ao clicar no botão Copiar Tudo', () => {
        render(<ContextMemoryViewerModal step={mockStepWithMessages} onClose={vi.fn()} />);

        const copyAllBtn = screen.getByText('Copiar Tudo');
        fireEvent.click(copyAllBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(screen.getByText('Copiado!')).toBeDefined();
    });

    it('deve fechar ao clicar no botão de fechar', () => {
        const handleClose = vi.fn();
        render(<ContextMemoryViewerModal step={mockStepWithMessages} onClose={handleClose} />);

        const closeBtn = document.getElementById('context-memory-modal-close');
        fireEvent.click(closeBtn);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('deve exibir mensagem amigável de fallback para eventos legados sem metadata.messages', () => {
        render(<ContextMemoryViewerModal step={mockLegacyStep} onClose={vi.fn()} />);

        expect(screen.getByText('Detalhes de Mensagens Não Disponíveis no Evento Legado')).toBeDefined();
        expect(screen.getByText(/Injetadas 1 interações brutas/)).toBeDefined();
    });
});

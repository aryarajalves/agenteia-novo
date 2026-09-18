import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionFunnelModal from '../../components/ConfigPanel/components/QuestionFunnels/QuestionFunnelModal';

vi.mock('../../../../api/client', () => ({
    api: {
        post: vi.fn()
    }
}));

describe('QuestionFunnelModal - Funcionalidade de Maximizar Campo', () => {
    const funnelWithSteps = {
        id: 10,
        name: 'Funil com Passos Multiplos',
        trigger_question: 'qual o valor do curso?',
        trigger_variations: ['quanto custa?'],
        similarity_threshold: 0.85,
        frequency_mode: 'once_per_lead',
        is_active: true,
        steps: [
            {
                step_number: 1,
                type: 'audio',
                media_url: 'https://cdn.exemplo.com/audio1.mp3',
                transcription: 'Audio explicando a estrutura e valores do treinamento.',
                content: '',
                delay_seconds: 2
            },
            {
                step_number: 2,
                type: 'text',
                media_url: '',
                transcription: '',
                content: 'Segue o link promocional com desconto exclusivo: https://site.com/promo',
                delay_seconds: 5
            }
        ]
    };

    const defaultProps = {
        isOpen: true,
        funnel: funnelWithSteps,
        onSave: vi.fn(),
        onClose: vi.fn(),
        loading: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar o botao Maximizar Campo para transcricao de audio e para mensagem de texto', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const audioMaximizeBtn = screen.getByTestId('maximize-step-audio-0');
        expect(audioMaximizeBtn).toBeInTheDocument();
        expect(audioMaximizeBtn).toHaveTextContent(/Maximizar Campo/i);

        const textMaximizeBtn = screen.getByTestId('maximize-step-text-1');
        expect(textMaximizeBtn).toBeInTheDocument();
        expect(textMaximizeBtn).toHaveTextContent(/Maximizar Campo/i);
    });

    it('deve abrir o modal de tela cheia ao clicar em maximizar no passo de mensagem de texto', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const textMaximizeBtn = screen.getByTestId('maximize-step-text-1');
        fireEvent.click(textMaximizeBtn);

        expect(screen.getByText('💬 Mensagem do Passo #2')).toBeInTheDocument();
        expect(screen.getByText(/Edição expandida e confortável do texto da mensagem do funil/i)).toBeInTheDocument();

        const expandedTextarea = screen.getByPlaceholderText('Digite o texto aqui...');
        expect(expandedTextarea).toBeInTheDocument();
        expect(expandedTextarea.value).toBe('Segue o link promocional com desconto exclusivo: https://site.com/promo');
    });

    it('deve atualizar o texto do passo ao digitar no editor em tela cheia e fechar ao clicar em Concluir', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const textMaximizeBtn = screen.getByTestId('maximize-step-text-1');
        fireEvent.click(textMaximizeBtn);

        const expandedTextarea = screen.getByPlaceholderText('Digite o texto aqui...');
        fireEvent.change(expandedTextarea, { target: { value: 'Texto atualizado pelo editor em tela cheia!' } });

        const concludeBtn = screen.getByRole('button', { name: /Concluir Edição/i });
        fireEvent.click(concludeBtn);

        expect(screen.queryByText(/Edição expandida e confortável do texto da mensagem do funil/i)).toBeNull();
        expect(screen.getByDisplayValue('Texto atualizado pelo editor em tela cheia!')).toBeInTheDocument();
    });

    it('deve permitir maximizar o campo de transcricao do audio e sincronizar alteracoes', () => {
        render(<QuestionFunnelModal {...defaultProps} />);

        const audioMaximizeBtn = screen.getByTestId('maximize-step-audio-0');
        fireEvent.click(audioMaximizeBtn);

        expect(screen.getByText('🎙️ Transcrição do Passo #1')).toBeInTheDocument();

        const expandedTextarea = screen.getByPlaceholderText('Digite o texto aqui...');
        expect(expandedTextarea.value).toBe('Audio explicando a estrutura e valores do treinamento.');

        fireEvent.change(expandedTextarea, { target: { value: 'Nova transcricao detalhada do audio...' } });

        const concludeBtn = screen.getByRole('button', { name: /Concluir Edição/i });
        fireEvent.click(concludeBtn);

        expect(screen.queryByText('🎙️ Transcrição do Passo #1')).toBeNull();
        expect(screen.getByDisplayValue('Nova transcricao detalhada do audio...')).toBeInTheDocument();
    });
});

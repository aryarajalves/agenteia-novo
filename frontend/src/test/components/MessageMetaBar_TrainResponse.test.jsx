import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageMetaBar from '../../components/ChatPlayground/components/MessageBubbleModules/MessageMetaBar';

describe('MessageMetaBar - Botão Treinar Resposta (Substituição de Joinha/Deslike)', () => {
    const baseMsg = {
        role: 'assistant',
        content: 'Resposta de teste do assistente para cache semântico.',
        metrics: {
            input_tokens: 100,
            output_tokens: 50,
            tokens: 150,
            cost: 0.002,
            response_time_ms: 800
        }
    };

    it('renderiza o botão Treinar Resposta e não exibe botões individuais de joinha e deslike', () => {
        const handleThumbsUpMock = vi.fn();

        render(
            <MessageMetaBar
                msg={baseMsg}
                msgIndex={0}
                isRegularUser={false}
                handleThumbsUp={handleThumbsUpMock}
                feedbackState={{}}
            />
        );

        // Deve exibir o botão Treinar Resposta
        const trainBtn = screen.getByRole('button', { name: /Treinar Resposta/i });
        expect(trainBtn).toBeInTheDocument();

        // Não deve haver botão com texto isolado 👍 nem 👎
        expect(screen.queryByText('👍')).not.toBeInTheDocument();
        expect(screen.queryByText('👎')).not.toBeInTheDocument();
    });

    it('ao clicar em Treinar Resposta chama handleThumbsUp com a mensagem e índice corretos', () => {
        const handleThumbsUpMock = vi.fn();

        render(
            <MessageMetaBar
                msg={baseMsg}
                msgIndex={2}
                isRegularUser={false}
                handleThumbsUp={handleThumbsUpMock}
                feedbackState={{}}
            />
        );

        const trainBtn = screen.getByRole('button', { name: /Treinar Resposta/i });
        fireEvent.click(trainBtn);

        expect(handleThumbsUpMock).toHaveBeenCalledTimes(1);
        expect(handleThumbsUpMock).toHaveBeenCalledWith(baseMsg, 2);
    });

    it('exibe Salvo no Cache após a resposta ser salva no cache semântico', () => {
        const handleThumbsUpMock = vi.fn();

        render(
            <MessageMetaBar
                msg={baseMsg}
                msgIndex={0}
                isRegularUser={false}
                handleThumbsUp={handleThumbsUpMock}
                feedbackState={{ 0: 'positive' }}
            />
        );

        // Botão de treinar não deve mais estar presente
        expect(screen.queryByRole('button', { name: /Treinar Resposta/i })).not.toBeInTheDocument();
        // Deve exibir a confirmação de salvo no cache
        expect(screen.getByText(/Salvo no Cache/i)).toBeInTheDocument();
    });
});
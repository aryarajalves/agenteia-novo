import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import ToolPromptModal from '../../components/ConfigPanel/components/Habilidades/ToolPromptModal';

describe('ToolPromptModal Component', () => {
    it('nao deve renderizar quando isOpen for false', () => {
        const { container } = render(
            <ToolPromptModal
                tool={{ id: 1, name: 'google_calendar', webhook_url: null }}
                isOpen={false}
                onClose={() => {}}
                value=""
                onChange={() => {}}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar modal com nome da ferramenta e textarea quando isOpen for true', () => {
        render(
            <ToolPromptModal
                tool={{ id: 1, name: 'google_calendar', webhook_url: null }}
                isOpen={true}
                onClose={() => {}}
                value="Prompt de teste"
                onChange={() => {}}
            />
        );
        expect(screen.getByText('google_calendar')).toBeInTheDocument();
        const textarea = screen.getByPlaceholderText(/Descreva quando esta ferramenta deve ser chamada/i);
        expect(textarea).toBeInTheDocument();
        expect(textarea.value).toBe('Prompt de teste');
    });

    it('deve chamar onClose ao clicar no botao de fechar', () => {
        const onCloseMock = vi.fn();
        render(
            <ToolPromptModal
                tool={{ id: 1, name: 'google_calendar', webhook_url: null }}
                isOpen={true}
                onClose={onCloseMock}
                value=""
                onChange={() => {}}
            />
        );
        const closeBtn = screen.getByRole('button', { name: '✕' });
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
});

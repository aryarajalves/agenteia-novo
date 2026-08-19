import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FullscreenTextareaModal from '../../components/WebhookManager/components/FullscreenTextareaModal';

describe('FullscreenTextareaModal Component', () => {
    it('não deve renderizar quando isOpen for false', () => {
        const { container } = render(
            <FullscreenTextareaModal
                isOpen={false}
                title="Editor de Prompt"
                value="Texto de teste"
                onChange={vi.fn()}
                onClose={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar título, textarea com valor e variáveis quando isOpen for true', () => {
        const onChange = vi.fn();
        const onClose = vi.fn();

        render(
            <FullscreenTextareaModal
                isOpen={true}
                title="🧠 Prompt de IA - Passo #1"
                subtitle="Instruções para o modelo de linguagem"
                value="Texto inicial do prompt"
                onChange={onChange}
                onClose={onClose}
                variables={['{nome}', '{telefone}']}
                placeholder="Escreva as instruções..."
            />
        );

        expect(screen.getByText('🧠 Prompt de IA - Passo #1')).toBeInTheDocument();
        expect(screen.getByText('Instruções para o modelo de linguagem')).toBeInTheDocument();
        
        const textarea = screen.getByPlaceholderText('Escreva as instruções...');
        expect(textarea).toBeInTheDocument();
        expect(textarea.value).toBe('Texto inicial do prompt');

        // Testar digitação no textarea
        fireEvent.change(textarea, { target: { value: 'Novo texto digitado' } });
        expect(onChange).toHaveBeenCalledWith('Novo texto digitado');

        // Testar clique em variável
        const varBtn = screen.getByRole('button', { name: '+ {nome}' });
        fireEvent.click(varBtn);
        expect(onChange).toHaveBeenCalledWith('Texto inicial do prompt {nome}');

        // Testar botão de concluir
        const closeBtn = screen.getByRole('button', { name: /Concluir Edição/i });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('deve fechar ao pressionar a tecla ESC', () => {
        const onClose = vi.fn();

        render(
            <FullscreenTextareaModal
                isOpen={true}
                title="Editor Fullscreen"
                value="Conteúdo"
                onChange={vi.fn()}
                onClose={onClose}
            />
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DeleteKeywordsSection from '../../components/WebhookManager/components/Common/DeleteKeywordsSection';

describe('DeleteKeywordsSection Componente', () => {
    it('deve exibir o campo de etiquetas padrão ao resetar mesmo quando labelsList estiver vazio', () => {
        render(
            <DeleteKeywordsSection
                keywords={['#resetar']}
                farewellMessage="Zerei a memoria do agente para esse contato."
                onMessageChange={vi.fn()}
                inputValue=""
                onInputChange={vi.fn()}
                onAdd={vi.fn()}
                onRemove={vi.fn()}
                deleteLabels={['robo', 'whatsapp']}
                onLabelsChange={vi.fn()}
                labelsList={[]}
            />
        );

        // Deve exibir o título e descrição das etiquetas padrão
        expect(screen.getByText(/Etiquetas padrão ao resetar \/ deletar contato/i)).toBeInTheDocument();
        expect(screen.getByText(/todas as etiquetas existentes no ZapVoice serão substituídas por estas etiquetas padrão/i)).toBeInTheDocument();
        
        // Deve renderizar as etiquetas selecionadas
        expect(screen.getByText('robo')).toBeInTheDocument();
        expect(screen.getByText('whatsapp')).toBeInTheDocument();

        // Deve exibir a palavra-chave configurada
        expect(screen.getByText('#resetar')).toBeInTheDocument();
    });

    it('deve chamar onLabelsChange ao remover uma etiqueta do deleteLabels', () => {
        const onLabelsChange = vi.fn();
        render(
            <DeleteKeywordsSection
                keywords={['#resetar']}
                farewellMessage="Adeus"
                onMessageChange={vi.fn()}
                inputValue=""
                onInputChange={vi.fn()}
                onAdd={vi.fn()}
                onRemove={vi.fn()}
                deleteLabels={['robo', 'whatsapp']}
                onLabelsChange={onLabelsChange}
                labelsList={['robo', 'whatsapp', 'iniciar']}
            />
        );

        // Encontra o botão de remover da etiqueta 'robo'
        const roboTag = screen.getByText('robo');
        const removeBtn = roboTag.parentElement.querySelector('button');
        fireEvent.click(removeBtn);

        expect(onLabelsChange).toHaveBeenCalledWith(['whatsapp']);
    });
});

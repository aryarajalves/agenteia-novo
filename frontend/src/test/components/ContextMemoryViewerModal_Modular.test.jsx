import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ContextMemoryHeader from '../../components/WebhookManager/components/ContextMemoryViewer/ContextMemoryHeader';
import ContextMemoryToolbar from '../../components/WebhookManager/components/ContextMemoryViewer/ContextMemoryToolbar';
import ContextMemoryMessageList from '../../components/WebhookManager/components/ContextMemoryViewer/ContextMemoryMessageList';
import ContextMemoryFooter from '../../components/WebhookManager/components/ContextMemoryViewer/ContextMemoryFooter';

describe('ContextMemoryViewer Modular Subcomponents', () => {
    describe('ContextMemoryHeader', () => {
        it('deve renderizar contadores e botão fechar', () => {
            const handleClose = vi.fn();
            render(
                <ContextMemoryHeader
                    totalMessages={4}
                    numInteractions={2}
                    contextWindow={5}
                    onClose={handleClose}
                />
            );

            expect(screen.getByText('Memória de Contexto Injetada')).toBeDefined();
            expect(screen.getByText('💬 4 mensagens')).toBeDefined();
            expect(screen.getByText('🔄 2 interações')).toBeDefined();
            expect(screen.getByText(/Janela Máx: 10 msgs/)).toBeDefined();

            const closeBtn = document.getElementById('context-memory-modal-close');
            fireEvent.click(closeBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('deve tratar singular no texto de mensagens e interações', () => {
            render(
                <ContextMemoryHeader
                    totalMessages={1}
                    numInteractions={1}
                    contextWindow={3}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('💬 1 mensagem')).toBeDefined();
            expect(screen.getByText('🔄 1 interação')).toBeDefined();
        });
    });

    describe('ContextMemoryToolbar', () => {
        it('deve acionar troca de filtros e input de busca', () => {
            const setRoleFilter = vi.fn();
            const setSearchTerm = vi.fn();
            const onCopyAll = vi.fn();

            render(
                <ContextMemoryToolbar
                    roleFilter="all"
                    setRoleFilter={setRoleFilter}
                    messagesCount={6}
                    userCount={3}
                    assistantCount={3}
                    searchTerm=""
                    setSearchTerm={setSearchTerm}
                    copiedAll={false}
                    onCopyAll={onCopyAll}
                />
            );

            fireEvent.click(screen.getByText(/👤 Lead \(3\)/));
            expect(setRoleFilter).toHaveBeenCalledWith('user');

            fireEvent.click(screen.getByText(/🤖 Agente \(3\)/));
            expect(setRoleFilter).toHaveBeenCalledWith('assistant');

            const input = screen.getByPlaceholderText('Buscar no histórico...');
            fireEvent.change(input, { target: { value: 'teste' } });
            expect(setSearchTerm).toHaveBeenCalledWith('teste');

            const copyBtn = screen.getByText('Copiar Tudo');
            fireEvent.click(copyBtn);
            expect(onCopyAll).toHaveBeenCalledTimes(1);
        });

        it('deve exibir estado de copiado quando copiedAll for true', () => {
            render(
                <ContextMemoryToolbar
                    roleFilter="all"
                    setRoleFilter={vi.fn()}
                    messagesCount={2}
                    userCount={1}
                    assistantCount={1}
                    searchTerm=""
                    setSearchTerm={vi.fn()}
                    copiedAll={true}
                    onCopyAll={vi.fn()}
                />
            );

            expect(screen.getByText('Copiado!')).toBeDefined();
        });
    });

    describe('ContextMemoryMessageList', () => {
        it('deve renderizar mensagem de histórico legado se não houver mensagens', () => {
            render(
                <ContextMemoryMessageList
                    messages={[]}
                    filteredMessages={[]}
                    stepContent="Conteúdo do evento legado"
                    copiedIdx={null}
                    onCopyMessage={vi.fn()}
                />
            );

            expect(screen.getByText('Detalhes de Mensagens Não Disponíveis no Evento Legado')).toBeDefined();
            expect(screen.getByText('Conteúdo do evento legado')).toBeDefined();
        });

        it('deve exibir mensagem quando a busca não retornar resultados', () => {
            render(
                <ContextMemoryMessageList
                    messages={[{ role: 'user', content: 'Olá' }]}
                    filteredMessages={[]}
                    stepContent=""
                    copiedIdx={null}
                    onCopyMessage={vi.fn()}
                />
            );

            expect(screen.getByText('Nenhuma mensagem encontrada para o filtro ou busca informada.')).toBeDefined();
        });

        it('deve renderizar mensagens e permitir acionar cópia individual', () => {
            const onCopyMessage = vi.fn();
            const msgs = [
                { role: 'user', content: 'Pergunta do lead' },
                { role: 'assistant', content: 'Resposta da IA' }
            ];

            render(
                <ContextMemoryMessageList
                    messages={msgs}
                    filteredMessages={msgs}
                    stepContent=""
                    copiedIdx={0}
                    onCopyMessage={onCopyMessage}
                />
            );

            expect(screen.getByText('Pergunta do lead')).toBeDefined();
            expect(screen.getByText('Resposta da IA')).toBeDefined();
            expect(screen.getByText('Copiado')).toBeDefined();

            const copyBtns = screen.getAllByRole('button');
            fireEvent.click(copyBtns[1]);
            expect(onCopyMessage).toHaveBeenCalledWith('Resposta da IA', 1);
        });
    });

    describe('ContextMemoryFooter', () => {
        it('deve renderizar texto informativo e disparar onClose', () => {
            const handleClose = vi.fn();
            render(<ContextMemoryFooter onClose={handleClose} />);

            expect(screen.getByText(/Estas mensagens foram carregadas do banco de dados/)).toBeDefined();
            const closeBtn = screen.getByText('Fechar');
            fireEvent.click(closeBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import PromptModal from '../../components/ChatPlayground/components/MessageBubbleModules/PromptModal';
import PromptModalHeader from '../../components/ChatPlayground/components/MessageBubbleModules/PromptModalHeader';
import PreRouterTabs from '../../components/ChatPlayground/components/MessageBubbleModules/PreRouterTabs';
import ResolvedPromptTabs from '../../components/ChatPlayground/components/MessageBubbleModules/ResolvedPromptTabs';
import PromptModalFooter from '../../components/ChatPlayground/components/MessageBubbleModules/PromptModalFooter';
import {
    extractStaticPrompt,
    extractDynamicBlocks,
    extractInjectedPrompt,
    getTextToCopy
} from '../../components/ChatPlayground/components/MessageBubbleModules/promptModalUtils';

describe('PromptModal e Submódulos Modulares', () => {
    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    describe('promptModalUtils', () => {
        const samplePrompt = `Você é um atendente virtual do WhatsApp.
Regras gerais de comportamento.
🎯 **QUALIFICAÇÃO DE LEAD (STATUS DO LEAD)**:
O lead está interessado no curso VIP.
### DIRETRIZES DE SEGURANÇA E ESTILO
Não compartilhe links externos não autorizados.
# CONTEXTO RAG:
FAQ sobre preços e horários.
# RESUMO DAS MEMÓRIAS
Nome: João`;

        it('deve extrair o prompt estático antes das diretrizes/rag/memórias', () => {
            const staticPrompt = extractStaticPrompt(samplePrompt);
            expect(staticPrompt).toContain('Você é um atendente virtual');
            expect(staticPrompt).not.toContain('### DIRETRIZES DE SEGURANÇA E ESTILO');
            expect(staticPrompt).not.toContain('# CONTEXTO RAG:');
        });

        it('deve extrair blocos dinâmicos de qualificação de lead', () => {
            const dynamicBlocks = extractDynamicBlocks(samplePrompt);
            expect(dynamicBlocks).toContain('🎯 **QUALIFICAÇÃO DE LEAD');
            expect(dynamicBlocks).toContain('O lead está interessado no curso VIP.');
            expect(dynamicBlocks).not.toContain('### DIRETRIZES DE SEGURANÇA');
        });

        it('deve extrair o prompt injetado pelo código', () => {
            const injectedPrompt = extractInjectedPrompt(samplePrompt);
            expect(injectedPrompt).toContain('### DIRETRIZES DE SEGURANÇA E ESTILO');
            expect(injectedPrompt).toContain('# CONTEXTO RAG:');
        });

        it('deve obter o texto para cópia de acordo com o tipo e a aba ativa', () => {
            const preRouterModal = {
                type: 'pre_router',
                content: 'raw content',
                rawData: {
                    is_lead_qualificado: true,
                    id_agente_alvo: 'agente_1',
                    perguntas_extraidas: 'Qual o valor?',
                    resumo_memorias: 'Lead quer saber o preço.'
                }
            };

            const classifText = getTextToCopy(preRouterModal, 'classifications');
            expect(classifText).toContain('"is_lead_qualificado": true');
            expect(classifText).toContain('"id_agente_alvo": "agente_1"');

            const questionsText = getTextToCopy(preRouterModal, 'questions');
            expect(questionsText).toBe('Qual o valor?');

            const memoryText = getTextToCopy(preRouterModal, 'memory');
            expect(memoryText).toBe('Lead quer saber o preço.');

            const normalModal = { type: 'resolved_prompt', content: 'Texto do resolved' };
            expect(getTextToCopy(normalModal, 'static')).toBe('Texto do resolved');
        });
    });

    describe('PromptModalHeader', () => {
        it('deve renderizar ícone, título, subtítulo e token badge para resolved_prompt', () => {
            const handleClose = vi.fn();
            render(
                <PromptModalHeader
                    activeModal={{ type: 'resolved_prompt', title: 'Prompt Final Resolvido' }}
                    totalTokens={1250}
                    onClose={handleClose}
                />
            );

            expect(screen.getByText('Prompt Final Resolvido')).toBeDefined();
            expect(screen.getByText('📝')).toBeDefined();
            expect(screen.getByText('Texto exato enviado ao modelo principal (GPT/Claude)')).toBeDefined();
            expect(screen.getByTestId('modal-token-badge')).toBeDefined();

            const closeBtn = screen.getByText('✕');
            fireEvent.click(closeBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('deve renderizar ícone e subtítulo para pre_router_prompt', () => {
            render(
                <PromptModalHeader
                    activeModal={{ type: 'pre_router_prompt', title: 'Prompt Pre-Router' }}
                    totalTokens={0}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('Prompt Pre-Router')).toBeDefined();
            expect(screen.getByText('📄')).toBeDefined();
            expect(screen.getByText('Prompt do classificador inicial (Pre-Router)')).toBeDefined();
            expect(screen.queryByTestId('modal-token-badge')).toBeNull();
        });
    });

    describe('PreRouterTabs', () => {
        it('deve permitir alternar entre abas do Pre-Router', () => {
            const setActiveTab = vi.fn();
            render(
                <PreRouterTabs
                    activePreRouterTab="classifications"
                    setActivePreRouterTab={setActiveTab}
                />
            );

            fireEvent.click(screen.getByText(/Perguntas Extraídas/));
            expect(setActiveTab).toHaveBeenCalledWith('questions');

            fireEvent.click(screen.getByText(/Resumo de Memória/));
            expect(setActiveTab).toHaveBeenCalledWith('memory');
        });
    });

    describe('ResolvedPromptTabs', () => {
        it('deve exibir as abas com contagens de tokens e acionar troca de aba', () => {
            const setActiveTab = vi.fn();
            render(
                <ResolvedPromptTabs
                    activeResolvedPromptTab="static"
                    setActiveResolvedPromptTab={setActiveTab}
                    staticTokens={500}
                    dynamicTokens={200}
                    injectedTokens={300}
                    totalTokens={1000}
                />
            );

            expect(screen.getByText(/Prompt Estático/)).toBeDefined();
            expect(screen.getByText(/Blocos Dinâmicos/)).toBeDefined();
            expect(screen.getByText(/Injetado pelo Código/)).toBeDefined();
            expect(screen.getByText('📊 Variáveis Injetadas')).toBeDefined();
            expect(screen.getByText(/Prompt Completo/)).toBeDefined();

            fireEvent.click(screen.getByText(/Blocos Dinâmicos/));
            expect(setActiveTab).toHaveBeenCalledWith('dynamic');
        });
    });

    describe('PromptModalFooter', () => {
        it('deve renderizar botões de copiar e fechar', () => {
            const onCopy = vi.fn();
            const onClose = vi.fn();
            const { rerender } = render(
                <PromptModalFooter copied={false} onCopy={onCopy} onClose={onClose} />
            );

            expect(screen.getByText('📋 Copiar Conteúdo')).toBeDefined();
            fireEvent.click(screen.getByText('📋 Copiar Conteúdo'));
            expect(onCopy).toHaveBeenCalledTimes(1);

            fireEvent.click(screen.getByText('Fechar'));
            expect(onClose).toHaveBeenCalledTimes(1);

            rerender(<PromptModalFooter copied={true} onCopy={onCopy} onClose={onClose} />);
            expect(screen.getByText('✅ Copiado!')).toBeDefined();
        });
    });

    describe('PromptModal Orquestrador', () => {
        it('não deve renderizar nada se activeModal for null', () => {
            const { container } = render(<PromptModal activeModal={null} onClose={vi.fn()} />);
            expect(container.firstChild).toBeNull();
        });

        it('deve copiar o conteúdo ao clicar em copiar', () => {
            render(
                <PromptModal
                    activeModal={{ type: 'resolved_prompt', title: 'Prompt Teste', content: 'Conteúdo do prompt' }}
                    onClose={vi.fn()}
                    activeResolvedPromptTab="static"
                    setActiveResolvedPromptTab={vi.fn()}
                />
            );

            fireEvent.click(screen.getByText('📋 Copiar Conteúdo'));
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Conteúdo do prompt');
        });
    });
});

import { describe, it, expect } from 'vitest';
import { normalizeMessagesList } from '../../components/ChatPlayground/utils/exportTemplates/normalizeMessages';
import { escapeHtml, generateConversationHtml } from '../../components/ChatPlayground/utils/exportTemplates/conversationTemplate';
import { conversationStyles } from '../../components/ChatPlayground/utils/exportTemplates/conversationStyles';
import * as exportTemplates from '../../components/ChatPlayground/utils/exportTemplates';

describe('ExportTraining Submódulos Modulares', () => {
    describe('normalizeMessagesList', () => {
        it('deve retornar array vazio para entradas nulas ou inválidas', () => {
            expect(normalizeMessagesList(null)).toEqual([]);
            expect(normalizeMessagesList(undefined)).toEqual([]);
            expect(normalizeMessagesList('texto')).toEqual([]);
        });

        it('deve normalizar formato de log do backend com user_message e agent_response', () => {
            const rawBackendLogs = [
                {
                    id: 10,
                    user_message: 'Quanto custa a mentoria?',
                    agent_response: 'A mentoria custa R$ 1.500.',
                    timestamp: '2026-09-01T12:00:00Z',
                    model_used: 'claude-3-5-sonnet',
                    input_tokens: 150,
                    output_tokens: 50,
                    cost_brl: 0.015
                }
            ];

            const result = normalizeMessagesList(rawBackendLogs);
            expect(result).toHaveLength(2);

            expect(result[0]).toEqual({
                id: '10_u',
                role: 'user',
                content: 'Quanto custa a mentoria?',
                timestamp: '2026-09-01T12:00:00Z'
            });

            expect(result[1]).toEqual({
                id: '10_a',
                role: 'assistant',
                content: 'A mentoria custa R$ 1.500.',
                timestamp: '2026-09-01T12:00:00Z',
                model_used: 'claude-3-5-sonnet',
                metrics: {
                    tokens: 200,
                    cost: 0.015
                }
            });
        });

        it('deve normalizar formato do estado do frontend', () => {
            const rawFrontendMsgs = [
                { isUser: true, text: 'Olá!' },
                { role: 'assistant', content: 'Olá! Como posso ajudar?', model: 'gpt-4o' }
            ];

            const result = normalizeMessagesList(rawFrontendMsgs);
            expect(result).toHaveLength(2);
            expect(result[0].role).toBe('user');
            expect(result[0].content).toBe('Olá!');
            expect(result[1].role).toBe('assistant');
            expect(result[1].content).toBe('Olá! Como posso ajudar?');
            expect(result[1].model_used).toBe('gpt-4o');
        });
    });

    describe('escapeHtml', () => {
        it('deve escapar caracteres especiais HTML corretamente', () => {
            expect(escapeHtml('<script>alert("xss") & \'test\'</script>')).toBe(
                '&lt;script&gt;alert(&quot;xss&quot;) &amp; &#039;test&#039;&lt;/script&gt;'
            );
            expect(escapeHtml('')).toBe('');
            expect(escapeHtml(null)).toBe('');
        });
    });

    describe('generateConversationHtml', () => {
        it('deve incluir os estilos de conversationStyles e meta badges no documento HTML', () => {
            const html = generateConversationHtml({
                agentName: 'Agente VIP',
                sessionId: 'session_xyz_789',
                messages: [
                    { role: 'user', content: 'Gostaria de agendar reunião.' },
                    {
                        role: 'assistant',
                        content: 'Claro! Segue o link de agendamento.',
                        metrics: { tokens: 85, cost: 0.002 },
                        model_used: 'gpt-4o-mini'
                    }
                ],
                exportedAt: '2026-09-15T15:30:00Z'
            });

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('--bg-color: #0b0f19;');
            expect(html).toContain('Conversa com Agente VIP');
            expect(html).toContain('session_xyz_789');
            expect(html).toContain('Gostaria de agendar reunião.');
            expect(html).toContain('Claro! Segue o link de agendamento.');
            expect(html).toContain('⚡ 85 tokens');
            expect(html).toContain('💰 R$ 0.0020');
            expect(html).toContain('✨ gpt-4o-mini');
        });

        it('deve exibir mensagem de conversa vazia se não houver mensagens', () => {
            const html = generateConversationHtml({
                agentName: 'Agente Sem Mensagens',
                sessionId: 'empty_sess',
                messages: []
            });

            expect(html).toContain('Nenhuma mensagem registrada nesta conversa.');
        });
    });

    describe('Barrels e Exportações', () => {
        it('deve exportar todas as funções utilitárias a partir do index do exportTemplates', () => {
            expect(exportTemplates.normalizeMessagesList).toBeDefined();
            expect(exportTemplates.conversationStyles).toBeDefined();
            expect(exportTemplates.escapeHtml).toBeDefined();
            expect(exportTemplates.generateConversationHtml).toBeDefined();
        });
    });
});

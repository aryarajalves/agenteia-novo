import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import React from 'react';
import AutomationPipelineModal from '../../components/WebhookManager/components/AutomationPipelineModal';
import { 
    parseDate, 
    parsePipelineSteps, 
    formatDuration, 
    getSmartDiagnostic, 
    getStepCategory, 
    calculatePipelineMetrics 
} from '../../components/WebhookManager/components/AutomationPipelineModal/utils/pipelineHelpers';

// Mock do módulo de config
vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:5000'
}));

// Mock dos modais secundários
vi.mock('../../components/WebhookManager/components/PreRouterViewerModal', () => ({
    default: ({ onClose }) => <div data-testid="prerouter-modal"><button onClick={onClose}>Fechar PreRouter</button></div>
}));
vi.mock('../../components/WebhookManager/components/RaioXViewerModal', () => ({
    default: ({ onClose }) => <div data-testid="raiox-modal"><button onClick={onClose}>Fechar RaioX</button></div>
}));
vi.mock('../../components/WebhookManager/components/RagViewerModal', () => ({
    default: ({ onClose }) => <div data-testid="rag-modal"><button onClick={onClose}>Fechar RAG</button></div>
}));

describe('pipelineHelpers', () => {
    it('deve formatar data UTC corretamente ou retornar data válida', () => {
        const d = parseDate('2026-08-19T20:00:00');
        expect(d).toBeInstanceOf(Date);
        expect(isNaN(d.getTime())).toBe(false);
    });

    it('deve formatar duração em milissegundos e segundos corretamente', () => {
        expect(formatDuration(350)).toBe('350ms');
        expect(formatDuration(1500)).toBe('1.5s');
        expect(formatDuration(65000)).toBe('1m 5s');
        expect(formatDuration(null)).toBeNull();
    });

    it('deve identificar diagnóstico inteligente para recusa de conexão', () => {
        const diag = getSmartDiagnostic('Tentativas esgotadas. [Errno 111] Connection refused', '❌ Falha de Conexão');
        expect(diag).not.toBeNull();
        expect(diag.type).toBe('connection_refused');
        expect(diag.title).toContain('Recusa de Conexão');
        expect(diag.tip).toContain('host.docker.internal');
    });

    it('deve identificar diagnóstico inteligente para erro de autenticação 401', () => {
        const diag = getSmartDiagnostic('Status 401: Unauthorized - invalid api key', '❌ Erro de Autenticação');
        expect(diag).not.toBeNull();
        expect(diag.type).toBe('auth_error');
        expect(diag.tip).toContain('credenciais');
    });

    it('deve classificar categorias de passos corretamente sem falsos positivos em prompts', () => {
        expect(getStepCategory({ step: '❌ Falha no Envio', detail: 'Erro de rede' })).toBe('errors');
        expect(getStepCategory({ step: '🧠 Analisando Intenção (Pre-Router)', detail: 'Saudação' })).toBe('ai');
        expect(getStepCategory({ step: '✅ Decisão da IA (Pre-Router)', detail: '{"eh_saudacao": false, "erro": false}' })).toBe('ai');
        expect(getStepCategory({ step: '🔍 Raio-X: Contexto Enviado', detail: 'Prompt com instruções: em caso de erro, trate a falha do usuário.' })).toBe('ai');
        expect(getStepCategory({ step: '🛠️ Ferramentas acionadas', detail: 'Google Calendar' })).toBe('tools');
    });

    it('deve calcular métricas consolidadas da pipeline', () => {
        const mockSteps = [
            { 
                category: 'ai', 
                durationMs: 400, 
                metadata: { cost: 0.05, usage: { total_tokens: 1000, cached_tokens: 400 } } 
            },
            { 
                category: 'tools', 
                durationMs: 800, 
                metadata: { cost: 0.02, usage: { total_tokens: 500, cached_tokens: 0 } } 
            },
            { 
                category: 'errors', 
                durationMs: 200, 
                title: '❌ Falha' 
            }
        ];

        const metrics = calculatePipelineMetrics(mockSteps, { status: 'error' });
        expect(metrics.totalTokens).toBe(1500);
        expect(metrics.cachedTokens).toBe(400);
        expect(metrics.cacheHitPercentage).toBe(27); // 400 / 1500 = 26.66% -> 27%
        expect(metrics.totalCost).toBeCloseTo(0.07);
        expect(metrics.errorCount).toBe(1);
        expect(metrics.statusInfo.label).toBe('Falha no Envio');
        expect(metrics.totalDurationFormatted).toBe('1.4s');
    });

    it('deve processar steps e anexar resposta final do agente se presente', () => {
        const event = {
            processing_steps: JSON.stringify([
                { step: 'Etapa 1', detail: 'Detalhe 1', timestamp: '2026-08-19T20:00:00Z' }
            ]),
            agent_response: 'Olá, como posso ajudar?'
        };

        const steps = parsePipelineSteps(event);
        expect(steps.length).toBe(2);
        expect(steps[0].title).toBe('Etapa 1');
        expect(steps[1].title).toBe('✅ Resposta Final Enviada');
        expect(steps[1].content).toBe('Olá, como posso ajudar?');
    });

    it('deve calcular a duração de cada passo como o tempo de execução daquele passo e não do anterior', () => {
        const mockEvent = {
            processing_steps: JSON.stringify([
                { 
                    step: '🧠 Analisando Intenção (Pre-Router)', 
                    detail: 'Análise...', 
                    timestamp: '2026-08-19T20:00:00.000Z' 
                },
                { 
                    step: '⚠️ Nenhuma Base de Conhecimento Vinculada', 
                    detail: 'Sem base', 
                    timestamp: '2026-08-19T20:00:12.600Z' 
                },
                { 
                    step: '✅ Decisão da IA (Pre-Router)', 
                    detail: 'Decisão...', 
                    timestamp: '2026-08-19T20:00:12.650Z' 
                }
            ]),
            agent_response: 'Olá!',
            updated_at: '2026-08-19T20:00:15.000Z'
        };

        const steps = parsePipelineSteps(mockEvent);
        expect(steps[0].durationMs).toBe(12600); // O Pre-Router levou 12.6s
        expect(steps[0].durationFormatted).toBe('12.6s');
        
        expect(steps[1].durationMs).toBe(50); // A checagem de base levou 50ms
        expect(steps[1].durationFormatted).toBe('50ms');

        expect(steps[2].durationMs).toBe(2350); // Tempo restante até updated_at
    });
});

describe('AutomationPipelineModal Component', () => {
    let mockOnClose;

    beforeEach(() => {
        mockOnClose = vi.fn();
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({})
        }));
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve())
            }
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('deve exibir a barra de resumo (SummaryBar) com duração, tokens e custo', () => {
        const mockEvent = {
            id: 1,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { 
                    step: '🤖 Conectando ao agente', 
                    detail: 'Agente Tarcira', 
                    timestamp: '2026-05-18T10:07:22Z' 
                },
                { 
                    step: '⚡ Resposta do Pre-Router', 
                    detail: 'Olá!', 
                    timestamp: '2026-05-18T10:07:23Z',
                    metadata: { cost: 0.015, usage: { total_tokens: 800, cached_tokens: 200 } }
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText(/Duração Total/i)).toBeInTheDocument();
        expect(screen.getByText('💎 Tokens')).toBeInTheDocument();
        expect(screen.getByText('800')).toBeInTheDocument();
        expect(screen.getByText(/Custo Total/i)).toBeInTheDocument();
        expect(screen.getByText(/Concluído/i)).toBeInTheDocument();
    });

    it('deve renderizar diagnóstico inteligente no card quando houver erro de conexão', () => {
        const mockEvent = {
            id: 2,
            webhook_config_id: 10,
            status: 'error',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { 
                    step: '❌ Falha de Conexão (Parte 1)', 
                    detail: 'Tentativas esgotadas (60s timeout). Último erro: [Errno 111] Connection refused', 
                    timestamp: '2026-05-18T10:07:35Z' 
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText(/Recusa de Conexão \(Serviço Inacessível\)/i)).toBeInTheDocument();
        expect(screen.getByText(/host\.docker\.internal/i)).toBeInTheDocument();
    });

    it('deve permitir filtrar passos por categorias usando as abas da FilterBar', () => {
        const mockEvent = {
            id: 3,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { step: '🧠 Analisando Intenção (Pre-Router)', detail: 'Saudação', timestamp: '2026-05-18T10:07:22Z' },
                { step: '🛠️ Variáveis Extraídas', detail: 'nome salvo', timestamp: '2026-05-18T10:07:23Z' },
                { step: '❌ Falha no Envio', detail: 'Erro temporário', timestamp: '2026-05-18T10:07:24Z' }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText(/Analisando Intenção/i)).toBeInTheDocument();
        expect(screen.getByText(/Variáveis Extraídas/i)).toBeInTheDocument();

        // Clicar na aba Erros & Alertas
        const errorTab = screen.getByText('Erros & Alertas');
        fireEvent.click(errorTab);

        expect(screen.getByRole('heading', { name: /Falha no Envio/i })).toBeInTheDocument();
        expect(screen.queryByText(/Analisando Intenção/i)).not.toBeInTheDocument();
    });

    it('deve copiar JSON do pipeline ao clicar no botão Copiar', async () => {
        const mockEvent = {
            id: 4,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { step: 'Etapa 1', detail: 'Teste', timestamp: '2026-05-18T10:07:22Z' }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        const copyBtn = screen.getByText(/Copiar Pipeline \(JSON\)/i);
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        await waitFor(() => {
            expect(screen.getByText(/Copiado para Clipboard!/i)).toBeInTheDocument();
        });
    });

    it('deve acionar o endpoint de retry ao clicar em Reenviar / Reprocessar', async () => {
        const mockEvent = {
            id: 5,
            webhook_config_id: 10,
            status: 'error',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { step: '❌ Falha', detail: 'Erro', timestamp: '2026-05-18T10:07:22Z' }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        const retryBtn = screen.getByText(/Reenviar \/ Reprocessar/i);
        fireEvent.click(retryBtn);

        // Deve exibir o popup de confirmação
        expect(screen.getByText(/Confirmar Reprocessamento/i)).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza de que deseja/i)).toBeInTheDocument();

        // Clicar em Sim, Reprocessar para confirmar
        const confirmBtn = screen.getByText(/Sim, Reprocessar/i);
        fireEvent.click(confirmBtn);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/webhooks/10/events/5/retry'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('deve renderizar o player de áudio exclusivamente 1 vez no passo Conteúdo Extraído e não nos demais passos', () => {
        const mockEvent = {
            id: 7,
            webhook_config_id: 10,
            status: 'completed',
            message_type: 'audio',
            link: 'https://storage.example.com/audio123.ogg',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                {
                    step: '📨 Mensagem enviada ao agente',
                    detail: 'Mensagem recebida: Olá, quero saber o valor.',
                    timestamp: '2026-05-18T10:07:22Z'
                },
                { 
                    step: '✅ Conteúdo Extraído', 
                    detail: 'Modelo de transcrição utilizado: whisper-1\n\nConteúdo: Olá, quero saber o valor.', 
                    timestamp: '2026-05-18T10:07:23Z',
                    metadata: {
                        media_url: 'https://storage.example.com/audio123.ogg',
                        media_type: 'audio'
                    }
                },
                {
                    step: '🧠 Raciocínio da IA',
                    detail: 'Processando contexto...',
                    timestamp: '2026-05-18T10:07:24Z'
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        // Deve existir exatamente 1 player em todo o modal
        const audioPlayers = screen.getAllByText(/Áudio Original Recebido/i);
        expect(audioPlayers).toHaveLength(1);
        expect(screen.getByText(/Abrir Link ↗/i)).toHaveAttribute('href', 'https://storage.example.com/audio123.ogg');
    });

    it('deve renderizar o preview de imagem e NUNCA o player de áudio quando for uma imagem', () => {
        const mockEvent = {
            id: 8,
            webhook_config_id: 10,
            status: 'completed',
            message_type: 'image',
            link: 'https://storage.example.com/mockup.png',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { 
                    step: '✅ Conteúdo Extraído', 
                    detail: '- TIPO DE IMAGEM: Anúncio/Criativo\n- TEMA / TEXTO PRINCIPAL: O erro invisível que custa R$ 30.000...', 
                    timestamp: '2026-05-18T10:07:23Z',
                    metadata: {
                        media_url: 'https://storage.example.com/mockup.png',
                        media_type: 'image'
                    }
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        // Deve exibir o preview de imagem
        expect(screen.getByText(/Imagem Original Recebida/i)).toBeInTheDocument();
        expect(screen.getByAltText(/Imagem recebida/i)).toHaveAttribute('src', 'https://storage.example.com/mockup.png');

        // NUNCA deve exibir o player de áudio
        expect(screen.queryByText(/Áudio Original Recebido/i)).not.toBeInTheDocument();
    });

    it('deve copiar o conteúdo de um passo individual ao clicar no botão Copiar do card', async () => {
        const mockEvent = {
            id: 9,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { step: '🧠 Análise', detail: 'Texto exclusivo para cópia', timestamp: '2026-05-18T10:07:22Z' }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        const copyCardBtn = screen.getByTitle(/Copiar texto desta etapa/i);
        fireEvent.click(copyCardBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Texto exclusivo para cópia');
        await waitFor(() => {
            expect(screen.getByText(/Copiado!/i)).toBeInTheDocument();
        });
    });

    it('deve alternar a velocidade de reprodução do áudio', () => {
        const mockEvent = {
            id: 10,
            webhook_config_id: 10,
            status: 'completed',
            message_type: 'audio',
            link: 'https://storage.example.com/audio123.ogg',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { 
                    step: '✅ Conteúdo Extraído', 
                    detail: 'Áudio teste', 
                    timestamp: '2026-05-18T10:07:23Z',
                    metadata: { media_url: 'https://storage.example.com/audio123.ogg', media_type: 'audio' }
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        const speedBtn15 = screen.getByTitle('Velocidade 1.5x');
        expect(speedBtn15).toBeInTheDocument();
        fireEvent.click(speedBtn15);

        const speedBtn20 = screen.getByTitle('Velocidade 2x');
        expect(speedBtn20).toBeInTheDocument();
        fireEvent.click(speedBtn20);
    });

    it('deve abrir e fechar o modal de visualização de imagem em tela cheia (Lightbox)', () => {
        const mockEvent = {
            id: 11,
            webhook_config_id: 10,
            status: 'completed',
            message_type: 'image',
            link: 'https://storage.example.com/comprovante.png',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { 
                    step: '✅ Conteúdo Extraído', 
                    detail: '- TIPO DE IMAGEM: Comprovante de Pagamento/PIX\n- VALOR: R$ 197,00', 
                    timestamp: '2026-05-18T10:07:23Z',
                    metadata: { media_url: 'https://storage.example.com/comprovante.png', media_type: 'image' }
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        // Clicar no botão Ampliar
        const expandBtn = screen.getByTitle(/Ver imagem ampliada/i);
        fireEvent.click(expandBtn);

        // Deve renderizar o Lightbox
        expect(screen.getByTestId('image-lightbox-backdrop')).toBeInTheDocument();
        expect(screen.getByText(/Visualização da Imagem Recebida/i)).toBeInTheDocument();

        // Fechar Lightbox
        const closeLightboxBtn = screen.getByTitle(/Fechar visualização/i);
        fireEvent.click(closeLightboxBtn);

        expect(screen.queryByTestId('image-lightbox-backdrop')).not.toBeInTheDocument();
    });

    it('deve exibir a economia de Prompt Caching na SummaryBar quando houver tokens cacheados', () => {
        const mockEvent = {
            id: 12,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { 
                    step: '🤖 Resposta', 
                    detail: 'Olá', 
                    timestamp: '2026-05-18T10:07:23Z',
                    metadata: { cost: 0.02, usage: { total_tokens: 5000, prompt_tokens: 4500, cached_tokens: 3000 } }
                }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText(/Economia:/i)).toBeInTheDocument();
    });

    it('deve fechar o modal ao clicar no botão fechar', () => {
        const mockEvent = {
            id: 6,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        const closeBtns = screen.getAllByText('✕');
        fireEvent.click(closeBtns[0]);

        expect(mockOnClose).toHaveBeenCalled();
    });
});


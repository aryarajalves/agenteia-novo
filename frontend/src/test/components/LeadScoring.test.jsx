import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadScoring from '../../components/LeadScoring';

// Mock dos configs globais
vi.mock('../../config', () => ({
    API_URL: 'http://test-api.com',
    AGENT_API_KEY: 'test-key'
}));

const mockLeadsData = [
    {
        id: 1,
        webhook_config_id: 10,
        conta_id: 1,
        inbox_id: 2,
        inbox_nome: "Inbox WhatsApp",
        conversa_id: 100,
        contato_id: 200,
        telefone: "+5511999998888",
        contato_nome: "Alice Silva",
        respostas_qualificacao: JSON.stringify([
            { question: "Qual seu cargo?", answer: "CEO" },
            { question: "Orçamento?", answer: "R$ 10.000" }
        ]),
        respostas_decoded: [
            { question: "Qual seu cargo?", answer: "CEO" },
            { question: "Orçamento?", answer: "R$ 10.000" }
        ],
        lead_score: 12,
        lead_classification: "Quente 🔥",
        lead_justification: "Excelente lead, perfil de tomadora de decisão com bom orçamento.",
        chatwoot_conversation_url: "https://chatwoot.com/conversations/100",
        leads_table: "leads_alice",
        updated_at: "2026-05-21T12:00:00.000Z"
    },
    {
        id: 2,
        webhook_config_id: 10,
        conta_id: 1,
        inbox_id: 2,
        inbox_nome: "Inbox WhatsApp",
        conversa_id: 101,
        contato_id: 201,
        telefone: "+5511977776666",
        contato_nome: "Bruno Santos",
        respostas_qualificacao: JSON.stringify([
            { question: "Qual seu cargo?", answer: "Estudante" }
        ]),
        respostas_decoded: [
            { question: "Qual seu cargo?", answer: "Estudante" }
        ],
        lead_score: 2,
        lead_classification: "Frio ❄️",
        lead_justification: "Lead desqualificado, sem renda ou cargo executivo no momento.",
        chatwoot_conversation_url: null,
        leads_table: "leads_bruno",
        updated_at: "2026-05-21T11:00:00.000Z"
    }
];

describe('LeadScoring Component', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
        localStorage.setItem('admin_token', 'test-token');
    });

    it('deve exibir o estado de loading inicialmente e depois carregar os leads', async () => {
        // Mock do fetch de listagem de leads
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLeadsData
        });
        global.fetch = mockFetch;

        render(<LeadScoring />);

        expect(screen.getByText(/Carregando contatos qualificados/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
            expect(screen.getByText('Bruno Santos')).toBeInTheDocument();
        });

        expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/leads/qualified', {
            headers: {
                'Authorization': 'Bearer test-token',
                'X-API-Key': 'test-key'
            }
        });
    });

    it('deve filtrar os leads ao digitar na caixa de pesquisa', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLeadsData
        });

        render(<LeadScoring />);

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Buscar por nome ou telefone/i);
        fireEvent.change(searchInput, { target: { value: 'Alice' } });

        expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        expect(screen.queryByText('Bruno Santos')).not.toBeInTheDocument();
    });

    it('deve filtrar os leads ao clicar no badge de temperatura', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLeadsData
        });

        render(<LeadScoring />);

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        });

        // Clicar no filtro Frio
        const coldFilter = screen.getByRole('button', { name: 'Frio' });
        fireEvent.click(coldFilter);

        expect(screen.getByText('Bruno Santos')).toBeInTheDocument();
        expect(screen.queryByText('Alice Silva')).not.toBeInTheDocument();
    });

    it('deve expandir e recolher o accordion para exibir perguntas, respostas e justificativa', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLeadsData
        });

        render(<LeadScoring />);

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        });

        // Inicialmente as respostas não devem estar visíveis na tela
        expect(screen.queryByText(/Respostas de Qualificação/i)).not.toBeInTheDocument();

        // Clicar no cabeçalho do card para expandir
        const header = screen.getByText('Alice Silva').closest('.lead-card-header');
        fireEvent.click(header);

        // Agora deve exibir o Q&A e a Justificativa da IA
        expect(screen.getByText(/Respostas de Qualificação/i)).toBeInTheDocument();
        expect(screen.getByText('CEO')).toBeInTheDocument();
        expect(screen.getByText(/Justificativa da IA/i)).toBeInTheDocument();
        expect(screen.getByText(/tomadora de decisão/i)).toBeInTheDocument();

        // Clicar novamente para fechar
        fireEvent.click(header);
        expect(screen.queryByText(/Respostas de Qualificação/i)).not.toBeInTheDocument();
    });

    it('deve acionar a API de recálculo e atualizar os dados na tela ao clicar em Recalcular', async () => {
        global.fetch = vi.fn()
            .mockImplementation((url, options) => {
                if (url.includes('/leads/qualified')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockLeadsData
                    });
                }
                if (url.includes('/recalculate-score')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            lead_score: 13,
                            lead_classification: "Quente 🔥",
                            lead_justification: "Justificativa recalculada atualizada!"
                        })
                    });
                }
                return Promise.reject(new Error('URL não mockada'));
            });

        render(<LeadScoring />);

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        });

        // Expandir o card
        const header = screen.getByText('Alice Silva').closest('.lead-card-header');
        fireEvent.click(header);

        const recalcBtn = screen.getByRole('button', { name: /Recalcular Score/i });
        fireEvent.click(recalcBtn);

        // Validar que o fetch de recálculo foi acionado
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://test-api.com/leads/leads_alice/1/recalculate-score',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer test-token',
                        'X-API-Key': 'test-key'
                    }
                }
            );
        });

        // Validar se o score na tela atualizou de 12 para 13
        await waitFor(() => {
            expect(screen.getByText('13')).toBeInTheDocument();
            expect(screen.getByText('Justificativa recalculada atualizada!')).toBeInTheDocument();
        });
    });

    it('deve exibir o badge do agente qualificador quando presente nos dados do lead', async () => {
        const mockLeadsWithAgent = [
            {
                ...mockLeadsData[0],
                agent_name: 'Robô de Vendas Premium'
            }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLeadsWithAgent
        });

        render(<LeadScoring />);

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        });

        expect(screen.getByText('🤖 Robô de Vendas Premium')).toBeInTheDocument();
    });

    it('deve abrir o modal de confirmação ao clicar na lixeira e remover o lead após confirmação', async () => {
        global.fetch = vi.fn()
            .mockImplementation((url, options) => {
                if (url.includes('/leads/qualified')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockLeadsData
                    });
                }
                if (url.includes('/leads/leads_alice/1') && options?.method === 'DELETE') {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, message: "Qualificação removida" })
                    });
                }
                return Promise.reject(new Error('URL não mockada'));
            });

        render(<LeadScoring />);

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument();
        });

        // O botão de lixeira está dentro do cabeçalho
        const deleteBtn = screen.getAllByTitle('Remover qualificação do lead')[0];
        expect(deleteBtn).toBeInTheDocument();

        // Clicar na lixeira
        fireEvent.click(deleteBtn);

        // O modal de confirmação (DeleteMessageModal) deve estar visível
        expect(screen.getByText(/Você tem certeza que deseja remover a qualificação deste contato/i)).toBeInTheDocument();
        expect(screen.getByText('Alice Silva')).toBeInTheDocument();

        // Clicar no botão de confirmar no modal (exclusão)
        const confirmBtn = screen.getByRole('button', { name: /Sim, Apagar/i });
        fireEvent.click(confirmBtn);

        // Validar que o fetch DELETE foi acionado
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://test-api.com/leads/leads_alice/1',
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer test-token',
                        'X-API-Key': 'test-key'
                    }
                }
            );
        });

        // O lead deve ter sido removido da tela
        await waitFor(() => {
            expect(screen.queryByText('Alice Silva')).not.toBeInTheDocument();
        });
    });
});

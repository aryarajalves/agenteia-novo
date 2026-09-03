import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LeadHistoryModal from '../../components/WebhookManager/components/LeadHistoryModal';
import { api } from '../../api/client';

// Helper para criar Response mock
const createMockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
});

vi.mock('../../api/client', () => {
    const mockApi = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    };
    return {
        api: mockApi,
        default: mockApi,
    };
});

describe('LeadHistoryModal Component', () => {
    const mockLead = {
        id: 10,
        telefone: '5511999998888',
        contato_nome: 'Aryaraj Alves',
    };

    const mockWebhook = {
        id: 2,
        name: 'Webhook Teste',
    };

    const mockEvents = [
        {
            id: 1,
            message_type: 'text',
            event_type: 'message',
            mensagem: 'Olá, sou um lead comum',
            dono: 'usuario',
            created_at: '2026-05-16T12:00:00Z',
        },
        {
            id: 2,
            message_type: 'text',
            event_type: 'memory',
            mensagem: 'Disparo externo de memória',
            dono: 'usuario',
            created_at: '2026-05-16T12:05:00Z',
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation(() => Promise.resolve(createMockResponse({
            items: mockEvents,
            total: 2,
            page: 1,
            page_size: 20
        })));
    });

    it('deve chamar o endpoint com event_type=all, exibir o badge correto e ocultar o botão de pipeline ⚡ para eventos de memória', async () => {
        render(
            <LeadHistoryModal
                lead={mockLead}
                webhook={mockWebhook}
                onClose={() => {}}
            />
        );

        // 1. Validar que a API foi chamada com &event_type=all
        expect(api.get).toHaveBeenCalledWith(
            expect.stringContaining('event_type=all')
        );

        // 2. Aguarda renderização dos eventos
        expect(await screen.findByText('Olá, sou um lead comum')).toBeInTheDocument();
        expect(screen.getByText('Disparo externo de memória')).toBeInTheDocument();

        // 3. Verificar que o evento normal tem a tag "USUÁRIO" e o de memória tem a tag "OUTRA PLATAFORMA"
        expect(screen.getByText('USUÁRIO')).toBeInTheDocument();
        expect(screen.getByText('🔌 OUTRA PLATAFORMA')).toBeInTheDocument();

        // 4. Buscar os botões de pipeline
        // O evento normal (id 1) deve ter o botão "⚡" (title "Ver Pipeline"),
        // mas o evento de memória (id 2) NÃO deve ter.
        const pipelineButtons = screen.queryAllByTitle('Ver Pipeline');
        expect(pipelineButtons.length).toBe(1);
    });

    it('deve abrir o modal de confirmação de exclusão e chamar a API para excluir o evento', async () => {
        api.post.mockResolvedValue(createMockResponse(null, 204));
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        render(
            <LeadHistoryModal
                lead={mockLead}
                webhook={mockWebhook}
                onClose={() => {}}
            />
        );

        // 1. Aguarda renderização dos eventos
        expect(await screen.findByText('Olá, sou um lead comum')).toBeInTheDocument();

        // 2. Clicar no botão de lixeira (excluir) do primeiro evento (id 1)
        const deleteButtons = screen.queryAllByTitle('Excluir');
        expect(deleteButtons.length).toBe(2);
        fireEvent.click(deleteButtons[0]);

        // 3. Validar se o modal de confirmação abriu
        expect(screen.getByText(/Tem certeza que deseja excluir permanentemente a mensagem/)).toBeInTheDocument();

        // 4. Clicar em "Sim, Excluir"
        const confirmBtn = screen.getByText('Sim, Excluir');
        fireEvent.click(confirmBtn);

        // 5. Validar que a API foi chamada com o ID correto e que disparou o toast
        await vi.waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                expect.stringContaining('/events/bulk-delete'),
                { event_ids: [1] }
            );
        });

        // 6. Validar o disparo do evento de toast
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.any(CustomEvent)
        );
        const toastEvent = dispatchSpy.mock.calls.find(call => call[0].type === 'app:toast')[0];
        expect(toastEvent.detail.message).toBe('Mensagem excluída com sucesso!');
        expect(toastEvent.detail.type).toBe('success');
    });

    it('deve chamar a API novamente para atualizar o histórico ao clicar no botão "Atualizar Histórico"', async () => {
        render(
            <LeadHistoryModal
                lead={mockLead}
                webhook={mockWebhook}
                onClose={() => {}}
            />
        );

        // 1. Aguarda carregar
        expect(await screen.findByText('Olá, sou um lead comum')).toBeInTheDocument();
        
        // Limpar histórico de chamadas do get para contar com precisão
        api.get.mockClear();

        // 2. Clicar no botão de Atualizar
        const reloadBtn = screen.getByTitle('Atualizar Histórico');
        expect(reloadBtn).toBeInTheDocument();
        fireEvent.click(reloadBtn);

        // 3. Validar se a API foi chamada novamente
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('deve exibir o botão de retentativa 🔄 apenas para eventos normais e acionar a API de retry após confirmação no modal', async () => {
        api.post.mockResolvedValue(createMockResponse({ ok: true }, 200));
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        render(
            <LeadHistoryModal
                lead={mockLead}
                webhook={mockWebhook}
                onClose={() => {}}
            />
        );

        // 1. Aguardar renderização dos eventos
        expect(await screen.findByText('Olá, sou um lead comum')).toBeInTheDocument();

        // 2. Verificar que o botão com title "Reiniciar Automação" existe
        const retryButtons = screen.queryAllByTitle('Reiniciar Automação');
        // Apenas o evento comum (id 1) é elegível. O de memória (id 2) não é.
        expect(retryButtons.length).toBe(1);

        // 3. Clicar no botão de retentativa 🔄
        fireEvent.click(retryButtons[0]);

        // 4. Validar se o modal de confirmação de retry abriu
        expect(screen.getByText(/Tem certeza que deseja reiniciar a automação para a mensagem/)).toBeInTheDocument();

        // 5. Clicar no botão "Sim, Reiniciar" do modal
        const confirmBtn = screen.getByText('Sim, Reiniciar');
        fireEvent.click(confirmBtn);

        // 6. Validar chamada da API
        await vi.waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                `/webhooks/${mockWebhook.id}/events/1/retry`
            );
        });

        // 7. Validar o disparo do toast
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.any(CustomEvent)
        );
        const toastEvent = dispatchSpy.mock.calls.find(
            call => call[0].type === 'app:toast' && call[0].detail.message.includes('Automação reiniciada com sucesso!')
        )[0];
        expect(toastEvent).toBeDefined();
        expect(toastEvent.detail.type).toBe('success');
    });

    it('deve renderizar todos os 4 botões de ação (🔄, ⚡, 💾, 🗑️) no evento elegível sem que nenhum botão fique oculto', async () => {
        render(
            <LeadHistoryModal
                lead={mockLead}
                webhook={mockWebhook}
                onClose={() => {}}
            />
        );

        // Aguardar o evento normal aparecer
        expect(await screen.findByText('Olá, sou um lead comum')).toBeInTheDocument();

        // Validar presença de todos os botões de ação para o evento
        expect(screen.getByTitle('Reiniciar Automação')).toBeInTheDocument();
        expect(screen.getByTitle('Ver Pipeline')).toBeInTheDocument();
        expect(screen.getByTestId('save-cache-btn-1')).toBeInTheDocument();
        const deleteButtons = screen.getAllByTitle('Excluir');
        expect(deleteButtons.length).toBeGreaterThanOrEqual(1);

        // Validar que o cabeçalho possui a coluna AÇÕES
        expect(screen.getByText('AÇÕES')).toBeInTheDocument();
    });
});


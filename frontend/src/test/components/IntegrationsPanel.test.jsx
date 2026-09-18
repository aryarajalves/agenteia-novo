import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IntegrationsPanel from '../../components/IntegrationsPanel';

// Mock da API
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
    },
}));

// Mock do WebhookManager para não complicar o teste
vi.mock('../../components/WebhookManager/index', () => ({
    default: () => <div data-testid="webhook-manager">Mock WebhookManager</div>,
}));

const renderIntegrationsPanel = () => {
    return render(
        <MemoryRouter>
            <IntegrationsPanel />
        </MemoryRouter>
    );
};

describe('IntegrationsPanel Component', () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockPost.mockReset();
        
        mockGet.mockImplementation((path) => {
            if (path === '/integrations/google/status') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: false }) });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    it('deve exibir tela de loading inicialmente', () => {
        mockGet.mockReturnValue(new Promise(() => { }));
        renderIntegrationsPanel();
        expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
    });

    it('deve exibir cards de integração após carregar', async () => {
        renderIntegrationsPanel();
        await waitFor(() => {
            expect(screen.getByText('Google Calendar')).toBeInTheDocument();
            expect(screen.getByText('WhatsApp (ZapJords)')).toBeInTheDocument();
        });
    });

    it('deve alternar entre as abas e filtrar os cards corretamente', async () => {
        renderIntegrationsPanel();
        await waitFor(() => {
            expect(screen.getByText('Google Calendar')).toBeInTheDocument();
            expect(screen.getByText('WhatsApp (ZapJords)')).toBeInTheDocument();
        });

        // 1. Clicar na aba Produtividade & Agendas
        fireEvent.click(screen.getByTestId('integrations-tab-productivity'));
        expect(screen.getByText('Google Calendar')).toBeInTheDocument();
        expect(screen.queryByText('WhatsApp (ZapJords)')).not.toBeInTheDocument();

        // 2. Clicar na aba Comunicação & Mensageria
        fireEvent.click(screen.getByTestId('integrations-tab-communication'));
        expect(screen.getByText('WhatsApp (ZapJords)')).toBeInTheDocument();
        expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();

        // 3. Clicar na aba Todas
        fireEvent.click(screen.getByTestId('integrations-tab-all'));
        expect(screen.getByText('Google Calendar')).toBeInTheDocument();
        expect(screen.getByText('WhatsApp (ZapJords)')).toBeInTheDocument();
    });

    it('deve abrir o guia ao clicar no botão correspondente', async () => {
        renderIntegrationsPanel();
        await waitFor(() => expect(screen.getByText('Guia das Integrações')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText('Guia das Integrações'));
        expect(screen.getByText('Guia das Integrações Globais')).toBeInTheDocument();
    });

    it('deve alternar para a visão do WhatsApp ao clicar em Configurar Webhooks', async () => {
        renderIntegrationsPanel();
        await waitFor(() => expect(screen.getByText('Configurar Webhooks')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText('Configurar Webhooks'));
        expect(screen.getByTestId('webhook-manager')).toBeInTheDocument();
        expect(screen.getByText('Voltar para Integrações')).toBeInTheDocument();
    });

    it('deve exibir status de conectado quando o Google está autenticado', async () => {
        mockGet.mockImplementation((path) => {
            if (path === '/integrations/google/status') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: true }) });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        renderIntegrationsPanel();
        await waitFor(() => {
            expect(screen.getByText('✓ CONECTADO')).toBeInTheDocument();
            expect(screen.getByText('⚡ Sincronizar Ferramentas de Agendamento no Catálogo')).toBeInTheDocument();
        });
    });
});


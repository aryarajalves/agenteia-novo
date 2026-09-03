import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TabSemanticCache from '../../components/ConfigPanel/components/TabSemanticCache';
import { api } from '../../api/client';

const mockSetSemanticCacheEnabled = vi.fn();
const mockSetSemanticCacheThreshold = vi.fn();

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => ({
        id: '36',
        isNew: false,
        semanticCacheEnabled: true,
        setSemanticCacheEnabled: mockSetSemanticCacheEnabled,
        semanticCacheThreshold: 92,
        setSemanticCacheThreshold: mockSetSemanticCacheThreshold
    })
}));

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
    }
}));

describe('TabSemanticCache Component', () => {
    const mockCacheItems = [
        {
            id: 1,
            agent_id: 36,
            user_query: 'como funciona o curso?',
            approved_response: 'O curso é 100% online com aulas em vídeo.',
            alternate_queries: ['o curso é online?'],
            usage_count: 14,
            is_active: true
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({
            ok: true,
            json: async () => ({
                items: mockCacheItems,
                total: 12,
                page: 1,
                page_size: 20,
                total_pages: 1
            })
        });
        api.post.mockResolvedValue({
            ok: true,
            json: async () => ({
                id: 2,
                agent_id: 36,
                user_query: 'qual a garantia?',
                approved_response: 'Garantia incondicional de 7 dias.',
                alternate_queries: [],
                usage_count: 0,
                is_active: true
            })
        });
        api.put.mockResolvedValue({
            ok: true,
            json: async () => ({
                ...mockCacheItems[0],
                user_query: 'como funciona o curso de vcs?',
                approved_response: 'O curso é 100% online com aulas liberadas semanalmente.'
            })
        });
    });

    it('deve renderizar as abas de navegação interna e a lista de respostas com page_size 20', async () => {
        render(<TabSemanticCache />);

        expect(screen.getByTestId('subtab-cache-responses')).toBeInTheDocument();
        expect(screen.getByTestId('subtab-cache-settings')).toBeInTheDocument();
        expect(screen.getByTestId('create-new-cache-btn')).toBeInTheDocument();

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page_size=20'));
            expect(screen.getByText(/como funciona o curso\?/i)).toBeInTheDocument();
            expect(screen.getByText(/14 economias/i)).toBeInTheDocument();
        });
    });

    it('deve alternar para a aba de Configurações & Limiares e exibir o slider de similaridade', () => {
        render(<TabSemanticCache />);

        const settingsTabBtn = screen.getByTestId('subtab-cache-settings');
        fireEvent.click(settingsTabBtn);

        expect(screen.getByTestId('semantic-cache-toggle-switch')).toBeChecked();
        expect(screen.getByTestId('semantic-cache-threshold-slider')).toBeInTheDocument();
        expect(screen.getByText(/Similaridade Mínima de Intenção para Disparo/i)).toBeInTheDocument();
    });

    it('deve abrir modal de criação ao clicar em Nova Resposta e salvar com sucesso', async () => {
        render(<TabSemanticCache />);

        const createBtn = screen.getByTestId('create-new-cache-btn');
        fireEvent.click(createBtn);

        expect(screen.getByText(/Cadastrar Nova Resposta no Cache/i)).toBeInTheDocument();

        const queryInput = screen.getByTestId('create-cache-query-input');
        const respInput = screen.getByTestId('create-cache-response-input');
        const submitBtn = screen.getByTestId('save-create-cache-btn');

        fireEvent.change(queryInput, { target: { value: 'qual a garantia?' } });
        fireEvent.change(respInput, { target: { value: 'Garantia incondicional de 7 dias.' } });

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/semantic-cache', {
                agent_id: 36,
                user_query: 'qual a garantia?',
                approved_response: 'Garantia incondicional de 7 dias.',
                alternate_queries: [],
                similarity_threshold: null,
                category_tag: null
            });
        });
    });

    it('deve exibir a barra de paginação com botões desativados quando houver apenas 1 página de respostas no cache', async () => {
        render(<TabSemanticCache />);

        await waitFor(() => {
            expect(screen.getByTestId('semantic-cache-pagination')).toBeInTheDocument();
        });

        const prevBtn = screen.getByTestId('semantic-cache-prev-page');
        const nextBtn = screen.getByTestId('semantic-cache-next-page');

        expect(prevBtn).toBeInTheDocument();
        expect(prevBtn).toBeDisabled();
        expect(nextBtn).toBeInTheDocument();
        expect(nextBtn).toBeDisabled();

        expect(screen.getByText(/Mostrando até/)).toBeInTheDocument();
        expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApproveCacheModal from '../../../components/ChatPlayground/components/ApproveCacheModal';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
    api: {
        get: vi.fn()
    }
}));

describe('ApproveCacheModal Component', () => {
    const mockModal = {
        msg: { content: 'O investimento no Método Laser Day é de R$297.' },
        userMsg: 'quanto custa o curso?',
        msgIndex: 1
    };
    const mockOnConfirm = vi.fn();
    const mockOnLinkExisting = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({
            ok: true,
            json: async () => ({
                items: [
                    {
                        id: 10,
                        user_query: 'como funciona o curso?',
                        approved_response: 'O curso é 100% online.',
                        alternate_queries: ['o curso é online?']
                    },
                    {
                        id: 20,
                        user_query: 'como consigo o certificado?',
                        approved_response: 'O certificado é emitido na área de membros.',
                        alternate_queries: ['tem certificado?']
                    }
                ]
            })
        });
    });

    it('não deve renderizar nada se modal for nulo', () => {
        const { container } = render(
            <ApproveCacheModal modal={null} onConfirm={mockOnConfirm} onCancel={mockOnCancel} isSaving={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve permitir alternar para a aba Vincular e filtrar respostas em tempo real', async () => {
        render(
            <ApproveCacheModal
                modal={mockModal}
                agentId="36"
                onConfirm={mockOnConfirm}
                onLinkExisting={mockOnLinkExisting}
                onCancel={mockOnCancel}
                isSaving={false}
            />
        );

        // Clica na aba de vincular
        const linkTabBtn = screen.getByTestId('tab-mode-link-btn');
        fireEvent.click(linkTabBtn);

        await waitFor(() => {
            expect(screen.getByTestId('select-existing-cache-item')).toBeInTheDocument();
        });

        // Clica no dropdown para abrir o menu e exibir o campo de busca
        const selectTrigger = screen.getByTestId('select-existing-cache-item');
        fireEvent.click(selectTrigger);

        await waitFor(() => {
            expect(screen.getByTestId('filter-existing-cache-input')).toBeInTheDocument();
        });

        // Digita no campo de filtro
        const filterInput = screen.getByTestId('filter-existing-cache-input');
        fireEvent.change(filterInput, { target: { value: 'certificado' } });

        // Valida que o preview exibiu a resposta filtrada
        expect(screen.getByText(/O certificado é emitido na área de membros/i)).toBeInTheDocument();

        // Clica no botão de vincular
        const linkSubmitBtn = screen.getByTestId('confirm-link-cache-btn');
        fireEvent.click(linkSubmitBtn);

        expect(mockOnLinkExisting).toHaveBeenCalledWith({
            cacheId: 20,
            newVariation: 'quanto custa o curso?',
            existingAlternateQueries: ['tem certificado?']
        });
    });

    it('deve abrir popup gigante de tela cheia ao clicar no botão de maximizar campo', () => {
        render(
            <ApproveCacheModal
                modal={mockModal}
                agentId="36"
                onConfirm={mockOnConfirm}
                onLinkExisting={mockOnLinkExisting}
                onCancel={mockOnCancel}
                isSaving={false}
            />
        );

        const maximizeBtn = screen.getByTestId('toggle-maximize-response-btn');
        fireEvent.click(maximizeBtn);

        expect(screen.getByText(/Edição expandida e confortável da resposta oficial/i)).toBeInTheDocument();
    });
});

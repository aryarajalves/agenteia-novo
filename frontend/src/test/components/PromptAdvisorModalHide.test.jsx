import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    }
}));

vi.mock('../../api/client', () => ({
    api: mockApi
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

import PromptEditor from '../../components/PromptEditor';

describe('PromptAdvisor - Ocultação da bolinha quando modais estão abertos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.get.mockImplementation((url) => {
            if (url === '/global-variables') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ variables: [] })
                });
            }
            if (url.includes('/agents/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: '1', name: 'Agente Teste' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    afterEach(() => {
        const existingModals = document.querySelectorAll('.modal-overlay');
        existingModals.forEach(m => m.remove());
    });

    it('deve exibir o botão da bolinha do assistente quando não há modal aberto', async () => {
        render(<PromptEditor value="Prompt de teste" onChange={() => {}} agentId="1" />);
        
        await waitFor(() => {
            const fab = screen.getByTitle('Assistente de Prompt');
            expect(fab).toBeInTheDocument();
        });
    });

    it('deve esconder o botão da bolinha do assistente quando uma modal-overlay é aberta', async () => {
        render(<PromptEditor value="Prompt de teste" onChange={() => {}} agentId="1" />);
        
        await waitFor(() => {
            expect(screen.getByTitle('Assistente de Prompt')).toBeInTheDocument();
        });

        // Simula abertura de modal adicionando elemento com .modal-overlay no body
        let modalEl;
        act(() => {
            modalEl = document.createElement('div');
            modalEl.className = 'modal-overlay';
            document.body.appendChild(modalEl);
        });

        await waitFor(() => {
            expect(screen.queryByTitle('Assistente de Prompt')).not.toBeInTheDocument();
        });

        // Simula fechamento da modal removendo o elemento
        act(() => {
            if (modalEl && modalEl.parentNode) {
                modalEl.parentNode.removeChild(modalEl);
            }
        });

        await waitFor(() => {
            expect(screen.getByTitle('Assistente de Prompt')).toBeInTheDocument();
        });
    });
});

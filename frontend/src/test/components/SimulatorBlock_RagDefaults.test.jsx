import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SimulatorBlock from '../../components/KnowledgeBaseManager/components/SimulatorBlock';
import { api } from '../../api/client';

const mockSetSimQuery = vi.fn();
const mockSetSimResults = vi.fn();
const mockSetSimLoading = vi.fn();

vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: () => ({
        kbId: 10,
        simQuery: 'pergunta de teste',
        setSimQuery: mockSetSimQuery,
        simResults: null,
        setSimResults: mockSetSimResults,
        simLoading: false,
        setSimLoading: mockSetSimLoading,
        reloadKnowledgeBase: vi.fn(),
        setItemToEdit: vi.fn(),
        setIsEditOpen: vi.fn(),
        items: []
    })
}));

vi.mock('../../api/client', () => ({
    api: {
        post: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [], discarded_items: [], usage: {} })
        }))
    }
}));

describe('SimulatorBlock - Padrões dos Filtros RAG', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve vir com MULTIQUERY marcado (checked=true) e PARENTEXPANSION desmarcado (checked=false) por padrão', () => {
        render(<SimulatorBlock />);

        // Localiza os checkboxes
        const multiQueryCheckbox = screen.getByLabelText(/MULTIQUERY/i);
        const parentExpansionCheckbox = screen.getByLabelText(/PARENTEXPANSION/i);

        expect(multiQueryCheckbox).toBeChecked();
        expect(parentExpansionCheckbox).not.toBeChecked();
    });

    it('deve enviar multi_query_enabled: true e parent_expansion_enabled: false na simulação de busca por padrão', async () => {
        render(<SimulatorBlock />);

        const simulateBtn = screen.getByRole('button', { name: /Testar Busca/i });
        fireEvent.click(simulateBtn);

        expect(api.post).toHaveBeenCalledWith(
            '/knowledge-bases/10/simulate-rag',
            expect.objectContaining({
                query: 'pergunta de teste',
                multi_query_enabled: true,
                parent_expansion_enabled: false,
                rerank_enabled: true,
                agentic_eval_enabled: true,
                translation_enabled: false
            })
        );
    });
});

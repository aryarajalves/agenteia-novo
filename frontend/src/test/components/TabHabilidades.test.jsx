import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TabHabilidades from '../../components/ConfigPanel/components/TabHabilidades';

// Mock do Contexto de Configuração
const mockSetSelectedTools = vi.fn();
const mockSetKnowledgeBaseIds = vi.fn();
const mockSetRagRetrievalCount = vi.fn();
const mockSetRagTranslationEnabled = vi.fn();
const mockSetRagMultiQueryEnabled = vi.fn();
const mockSetRagRerankEnabled = vi.fn();
const mockSetRagParentExpansionEnabled = vi.fn();
const mockSetRagAgenticEvalEnabled = vi.fn();
const mockSetRagKbRoutingEnabled = vi.fn();
const mockSetRagKbRoutingVariable = vi.fn();
const mockSetShowHabilidadesGuide = vi.fn();

const mockConfigValues = {
    kbList: [],
    knowledgeBaseIds: [],
    setKnowledgeBaseIds: mockSetKnowledgeBaseIds,
    ragRetrievalCount: 5,
    setRagRetrievalCount: mockSetRagRetrievalCount,
    ragTranslationEnabled: false,
    setRagTranslationEnabled: mockSetRagTranslationEnabled,
    ragMultiQueryEnabled: false,
    setRagMultiQueryEnabled: mockSetRagMultiQueryEnabled,
    ragRerankEnabled: false,
    setRagRerankEnabled: mockSetRagRerankEnabled,
    ragParentExpansionEnabled: false,
    setRagParentExpansionEnabled: mockSetRagParentExpansionEnabled,
    ragAgenticEvalEnabled: false,
    setRagAgenticEvalEnabled: mockSetRagAgenticEvalEnabled,
    ragKbRoutingEnabled: false,
    setRagKbRoutingEnabled: mockSetRagKbRoutingEnabled,
    ragKbRoutingVariable: '',
    setRagKbRoutingVariable: mockSetRagKbRoutingVariable,
    toolsList: [
        { id: 1, name: 'google_calendar_manager', webhook_url: null },
        { id: 2, name: 'transferir_robo', webhook_url: null },
        { id: 3, name: 'webhook_customizado', webhook_url: 'https://webhook.site/test' }
    ],
    selectedTools: [],
    setSelectedTools: mockSetSelectedTools,
    toolPrompts: {},
    setToolPrompts: vi.fn(),
    unansweredHandoffEnabled: true,
    setUnansweredHandoffEnabled: vi.fn(),
    unansweredHandoffLimit: 2,
    setUnansweredHandoffLimit: vi.fn(),
    unansweredQuestionPrompt: '',
    setUnansweredQuestionPrompt: vi.fn(),
    googleConnected: false,
    showHabilidadesGuide: false,
    setShowHabilidadesGuide: mockSetShowHabilidadesGuide
};

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn().mockResolvedValue({
            data: [
                { id: 1, key: 'curso_interesse', description: 'Curso de interesse do lead' },
                { id: 2, key: 'produto_interesse', description: 'Produto do lead' }
            ]
        }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigValues
}));

const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TabHabilidades Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfigValues.selectedTools = [];
    });

    it('deve renderizar a sub-aba de Conhecimento (RAG) por padrão', () => {
        renderWithRouter(<TabHabilidades />);
        expect(screen.getByText('📚 Conhecimento Externo (RAG)')).toBeInTheDocument();
        expect(screen.getByText('Vincular Bases de Conhecimento')).toBeInTheDocument();
    });

    it('deve alternar para a sub-aba Ações & Ferramentas e exibir ferramentas e seção de dúvidas', () => {
        renderWithRouter(<TabHabilidades />);
        
        // Clicar na sub-aba Ações & Ferramentas
        const actionsTabBtn = screen.getByRole('button', { name: /🔗 Ações & Ferramentas/i });
        fireEvent.click(actionsTabBtn);

        expect(screen.getByText(/Ações & Ferramentas \(API\)/i)).toBeInTheDocument();
        expect(screen.getByText('Adicionar Habilidades ao Agente')).toBeInTheDocument();
        expect(screen.getByText('Dúvidas Sem Resposta & Transbordo Humano')).toBeInTheDocument();
    });

    it('deve exibir ferramentas normais no dropdown, mas ocultar transferir_robo', () => {
        renderWithRouter(<TabHabilidades />);
        
        const actionsTabBtn = screen.getByRole('button', { name: /🔗 Ações & Ferramentas/i });
        fireEvent.click(actionsTabBtn);

        const optionGoogle = screen.queryByText('📅 google_calendar_manager');
        const optionWebhook = screen.queryByText('🔗 webhook_customizado');
        const optionTransferirRobo = screen.queryByText(/transferir_robo/i);

        expect(optionGoogle).toBeInTheDocument();
        expect(optionWebhook).toBeInTheDocument();
        expect(optionTransferirRobo).not.toBeInTheDocument();
    });

    it('deve renderizar chips das ferramentas normais vinculadas, mas ocultar chip do transferir_robo', () => {
        mockConfigValues.selectedTools = [1, 2];
        
        renderWithRouter(<TabHabilidades />);

        const actionsTabBtn = screen.getByRole('button', { name: /🔗 Ações & Ferramentas/i });
        fireEvent.click(actionsTabBtn);

        // O chip do google_calendar_manager deve aparecer
        expect(screen.getAllByText(/google_calendar_manager/i).length).toBeGreaterThan(0);
        
        // O chip do transferir_robo não deve aparecer de jeito nenhum
        const chipTransferirRobo = screen.queryByText(/transferir_robo/i);
        expect(chipTransferirRobo).not.toBeInTheDocument();
    });

    it('deve exibir o módulo de Roteamento Agêntico de Bases na lista de módulos avançados', () => {
        renderWithRouter(<TabHabilidades />);
        expect(screen.getByText('🎯 Roteamento Agêntico de Bases (KB Routing)')).toBeInTheDocument();
        expect(screen.getByText(/direciona a busca apenas para a base certa/i)).toBeInTheDocument();
    });

    it('deve exibir o seletor de variável quando ragKbRoutingEnabled for true e permitir alternar', async () => {
        mockConfigValues.ragKbRoutingEnabled = true;
        mockConfigValues.ragKbRoutingVariable = 'curso_interesse';

        renderWithRouter(<TabHabilidades />);

        expect(screen.getByText('Variável de Produto/Curso para Roteamento:')).toBeInTheDocument();
        const selectVar = screen.getByRole('combobox', { name: /Variável de Roteamento de Base/i });
        expect(selectVar).toBeInTheDocument();

        await waitFor(() => {
            expect(selectVar.value).toBe('curso_interesse');
        });

        fireEvent.change(selectVar, { target: { value: 'produto_interesse' } });
        expect(mockSetRagKbRoutingVariable).toHaveBeenCalledWith('produto_interesse');
    });
});

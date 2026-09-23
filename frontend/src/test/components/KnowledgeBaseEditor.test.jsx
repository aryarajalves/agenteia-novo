import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import KnowledgeBaseEditor from '../../components/KnowledgeBaseEditor';
import KnowledgeBaseEditorHeader from '../../components/KnowledgeBaseEditorModules/components/KnowledgeBaseEditorHeader';
import KnowledgeBaseMetadataForm from '../../components/KnowledgeBaseEditorModules/components/KnowledgeBaseMetadataForm';
import KnowledgeBaseSidePanel from '../../components/KnowledgeBaseEditorModules/components/KnowledgeBaseSidePanel';

// Mock api client
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

// Mock KnowledgeBaseManager
vi.mock('../../components/KnowledgeBaseManager/index', () => ({
    default: ({ kbId, knowledgeBase }) => (
        <div data-testid="kb-manager-mock">
            KBManager Mock - ID: {kbId} - Total Itens: {knowledgeBase?.length || 0}
        </div>
    )
}));

// Mock ExpandableField
vi.mock('../../components/ExpandableField', () => ({
    default: ({ label, value, onChange, placeholder }) => (
        <div data-testid="expandable-field-mock">
            <label>{label}</label>
            <textarea
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    )
}));

import { api } from '../../api/client';

describe('KnowledgeBaseEditor & Subcomponentes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Subcomponente KnowledgeBaseEditorHeader', () => {
        it('deve renderizar botão voltar e ocultar abas no modo criação', () => {
            const navigate = vi.fn();
            render(
                <MemoryRouter>
                    <KnowledgeBaseEditorHeader isNew={true} view="metadata" navigate={navigate} />
                </MemoryRouter>
            );

            expect(screen.getByText(/Voltar para lista/i)).toBeInTheDocument();
            expect(screen.getByText('Nova Base de Conhecimento')).toBeInTheDocument();
            expect(screen.queryByText('⚙️ Identificação')).toBeNull();
            expect(screen.queryByText('📚 Conteúdo')).toBeNull();
        });

        it('deve renderizar abas e acionar navegação no modo edição', () => {
            const navigate = vi.fn();
            render(
                <MemoryRouter>
                    <KnowledgeBaseEditorHeader isNew={false} view="metadata" navigate={navigate} />
                </MemoryRouter>
            );

            const metaTab = screen.getByText('⚙️ Identificação');
            const contentTab = screen.getByText('📚 Conteúdo');
            expect(metaTab).toBeInTheDocument();
            expect(contentTab).toBeInTheDocument();

            fireEvent.click(contentTab);
            expect(navigate).toHaveBeenCalledWith('?view=content');
        });
    });

    describe('Subcomponente KnowledgeBaseMetadataForm', () => {
        it('deve permitir alterar nome, tipo e disparar salvamento', () => {
            const setName = vi.fn();
            const setKbType = vi.fn();
            const setDescription = vi.fn();
            const handleSave = vi.fn();

            render(
                <KnowledgeBaseMetadataForm
                    name="FAQ Vendas"
                    setName={setName}
                    description="Descricao RAG"
                    setDescription={setDescription}
                    kbType="qa"
                    setKbType={setKbType}
                    isNew={true}
                    handleSave={handleSave}
                />
            );

            const input = screen.getByDisplayValue('FAQ Vendas');
            fireEvent.change(input, { target: { value: 'FAQ Novo' } });
            expect(setName).toHaveBeenCalledWith('FAQ Novo');

            const prodBtn = screen.getByRole('button', { name: /Produtos/i });
            fireEvent.click(prodBtn);
            expect(setKbType).toHaveBeenCalledWith('product');

            const saveBtn = screen.getByRole('button', { name: /Criar e Ir para Conteúdo/i });
            fireEvent.click(saveBtn);
            expect(handleSave).toHaveBeenCalledTimes(1);
        });

        it('deve desabilitar alteração de tipo quando não for nova base', () => {
            render(
                <KnowledgeBaseMetadataForm
                    name="FAQ Vendas"
                    setName={vi.fn()}
                    description=""
                    setDescription={vi.fn()}
                    kbType="qa"
                    setKbType={vi.fn()}
                    isNew={false}
                    handleSave={vi.fn()}
                />
            );

            expect(screen.getByText(/O tipo da base não pode ser alterado após a criação/i)).toBeInTheDocument();
            const qaBtn = screen.getByRole('button', { name: /FAQ \/ QA/i });
            expect(qaBtn).toBeDisabled();
        });
    });

    describe('Subcomponente KnowledgeBaseSidePanel', () => {
        it('deve exibir contador de itens quando em edição e dicas de configuração', () => {
            render(<KnowledgeBaseSidePanel isNew={false} itemsCount={42} />);

            expect(screen.getByText('42')).toBeInTheDocument();
            expect(screen.getByText('Itens indexados')).toBeInTheDocument();
            expect(screen.getByText('💡 Dicas de Configuração')).toBeInTheDocument();
        });

        it('não deve exibir painel de status quando for nova base', () => {
            render(<KnowledgeBaseSidePanel isNew={true} itemsCount={0} />);

            expect(screen.queryByText('📊 Status da Base')).toBeNull();
            expect(screen.getByText('💡 Dicas de Configuração')).toBeInTheDocument();
        });
    });

    describe('Fluxo Integrado do KnowledgeBaseEditor', () => {
        it('deve carregar dados da base existente e renderizar o formulário', async () => {
            api.get.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 15,
                    name: 'Base Suporte',
                    description: 'Base para atendimento ao cliente',
                    kb_type: 'qa',
                    items: [{ id: 1, question: 'O que é?', answer: 'Resposta' }]
                })
            });

            render(
                <MemoryRouter initialEntries={['/knowledge-bases/15?view=metadata']}>
                    <Routes>
                        <Route path="/knowledge-bases/:id" element={<KnowledgeBaseEditor />} />
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByText('Carregando base...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByDisplayValue('Base Suporte')).toBeInTheDocument();
            });

            expect(screen.getByText('Configurar Identificação')).toBeInTheDocument();
            expect(screen.getByText('Itens indexados')).toBeInTheDocument();
        });

        it('deve renderizar visualização de conteúdo quando view=content', async () => {
            api.get.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 20,
                    name: 'Base Catálogo',
                    description: 'Produtos',
                    kb_type: 'product',
                    items: [{ id: 1 }, { id: 2 }, { id: 3 }]
                })
            });

            render(
                <MemoryRouter initialEntries={['/knowledge-bases/20?view=content']}>
                    <Routes>
                        <Route path="/knowledge-bases/:id" element={<KnowledgeBaseEditor />} />
                    </Routes>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByTestId('kb-manager-mock')).toBeInTheDocument();
            });

            expect(screen.getByText(/Total Itens: 3/i)).toBeInTheDocument();
            expect(screen.getByText('Gerenciar Conteúdo')).toBeInTheDocument();
        });

        it('deve exibir mensagem de erro se tentar salvar sem nome', async () => {
            render(
                <MemoryRouter initialEntries={['/knowledge-bases/new']}>
                    <Routes>
                        <Route path="/knowledge-bases/:id" element={<KnowledgeBaseEditor />} />
                    </Routes>
                </MemoryRouter>
            );

            const input = screen.getByDisplayValue('Nova Base de Conhecimento');
            fireEvent.change(input, { target: { value: '   ' } });

            const saveBtn = screen.getByRole('button', { name: /Criar e Ir para Conteúdo/i });
            fireEvent.click(saveBtn);

            expect(await screen.findByText('O nome da base é obrigatório.')).toBeInTheDocument();
        });
    });
});

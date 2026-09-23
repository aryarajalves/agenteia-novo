import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { formatDate, getClassificationClass, filterAndSortLeads } from '../../components/LeadScoring/utils/leadScoringUtils';
import LeadScoringFilters from '../../components/LeadScoring/components/LeadScoringFilters';
import LeadScoringCardHeader from '../../components/LeadScoring/components/LeadScoringCardHeader';
import LeadScoringCardDetails from '../../components/LeadScoring/components/LeadScoringCardDetails';
import LeadScoringCard from '../../components/LeadScoring/components/LeadScoringCard';

describe('LeadScoring Modular Components & Utils', () => {
    describe('leadScoringUtils', () => {
        it('formatDate deve formatar datas ISO para o padrão pt-BR ou retornar vazio', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate('')).toBe('');
            const formatted = formatDate('2026-05-21T15:30:00.000Z');
            expect(formatted).toMatch(/21\/05\/2026/);
        });

        it('getClassificationClass deve normalizar adequadamente as classes térmicas', () => {
            expect(getClassificationClass('Quente 🔥')).toBe('quente');
            expect(getClassificationClass('Morno ⚡')).toBe('morno');
            expect(getClassificationClass('Frio ❄️')).toBe('frio');
            expect(getClassificationClass(null)).toBe('indefinida');
            expect(getClassificationClass('')).toBe('indefinida');
        });

        it('filterAndSortLeads deve filtrar por texto e ordenar por score e data', () => {
            const sampleLeads = [
                { id: 1, contato_nome: 'Carlos Souza', telefone: '11911112222', lead_score: 5, lead_classification: 'Morno ⚡', updated_at: '2026-01-01' },
                { id: 2, contato_nome: 'Ana Lima', telefone: '11933334444', lead_score: 12, lead_classification: 'Quente 🔥', updated_at: '2026-01-02' },
                { id: 3, contato_nome: 'Bia Silva', telefone: '11955556666', lead_score: 2, lead_classification: 'Frio ❄️', updated_at: '2026-01-03' }
            ];

            // Busca por nome
            const filteredByName = filterAndSortLeads(sampleLeads, 'Carlos');
            expect(filteredByName).toHaveLength(1);
            expect(filteredByName[0].contato_nome).toBe('Carlos Souza');

            // Filtro por temperatura
            const filteredByTemp = filterAndSortLeads(sampleLeads, '', 'Quente 🔥');
            expect(filteredByTemp).toHaveLength(1);
            expect(filteredByTemp[0].contato_nome).toBe('Ana Lima');

            // Ordenação por score decrescente
            const sortedByHot = filterAndSortLeads(sampleLeads, '', 'Todos', 'hot');
            expect(sortedByHot[0].contato_nome).toBe('Ana Lima'); // score 12
            expect(sortedByHot[1].contato_nome).toBe('Carlos Souza'); // score 5
            expect(sortedByHot[2].contato_nome).toBe('Bia Silva'); // score 2

            // Ordenação por data mais recente
            const sortedByRecent = filterAndSortLeads(sampleLeads, '', 'Todos', 'recent');
            expect(sortedByRecent[0].contato_nome).toBe('Bia Silva'); // 2026-01-03
        });
    });

    describe('LeadScoringFilters', () => {
        it('deve disparar callbacks ao interagir com filtros', () => {
            const setSearchQuery = vi.fn();
            const setFilterClass = vi.fn();
            const setSortBy = vi.fn();

            render(
                <LeadScoringFilters
                    searchQuery=""
                    setSearchQuery={setSearchQuery}
                    filterClass="Todos"
                    setFilterClass={setFilterClass}
                    sortBy="hot"
                    setSortBy={setSortBy}
                />
            );

            // Busca
            const input = screen.getByPlaceholderText(/Buscar por nome ou telefone/i);
            fireEvent.change(input, { target: { value: 'Marcos' } });
            expect(setSearchQuery).toHaveBeenCalledWith('Marcos');

            // Badge Quente
            const warmBadge = screen.getByRole('button', { name: 'Quente' });
            fireEvent.click(warmBadge);
            expect(setFilterClass).toHaveBeenCalledWith('Quente 🔥');

            // Select
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'recent' } });
            expect(setSortBy).toHaveBeenCalledWith('recent');
        });
    });

    describe('LeadScoringCardHeader', () => {
        const mockLead = {
            id: 1,
            leads_table: 'leads_test',
            contato_nome: 'Marcos Paulo',
            telefone: '+5511988887777',
            lead_score: 11,
            lead_classification: 'Quente 🔥',
            inbox_nome: 'WhatsApp Oficial',
            agent_name: 'Agente Vendas',
            updated_at: '2026-05-20T10:00:00.000Z'
        };

        it('deve renderizar dados do lead e acionar toggleExpand e requestDelete', () => {
            const onToggleExpand = vi.fn();
            const onRequestDelete = vi.fn();

            render(
                <LeadScoringCardHeader
                    lead={mockLead}
                    leadUniqueId="leads_test_1"
                    isExpanded={false}
                    isDeleting={false}
                    onToggleExpand={onToggleExpand}
                    onRequestDelete={onRequestDelete}
                />
            );

            expect(screen.getByText('Marcos Paulo')).toBeInTheDocument();
            expect(screen.getByText(/WhatsApp Oficial/)).toBeInTheDocument();
            expect(screen.getByText(/Agente Vendas/)).toBeInTheDocument();
            expect(screen.getByText('11')).toBeInTheDocument();
            expect(screen.getByText('/13')).toBeInTheDocument();

            // Clicar no header aciona toggleExpand
            const header = screen.getByText('Marcos Paulo').closest('.lead-card-header');
            fireEvent.click(header);
            expect(onToggleExpand).toHaveBeenCalledWith('leads_test_1');

            // Clicar no botão de deletar (lixeira) aciona onRequestDelete sem propagar toggleExpand duplicado
            const trashBtn = screen.getByRole('button', { name: '🗑️' });
            fireEvent.click(trashBtn);
            expect(onRequestDelete).toHaveBeenCalledWith(mockLead);
        });
    });

    describe('LeadScoringCardDetails', () => {
        const mockLeadWithQA = {
            id: 1,
            contato_nome: 'Marcos Paulo',
            telefone: '5511999998888',
            respostas_decoded: [
                { pergunta: 'Qual a sua meta?', resposta: 'Dobrar de faturamento' }
            ],
            lead_justification: 'Potencial cliente de alto ticket.',
            chatwoot_conversation_url: 'https://chatwoot.com/123'
        };

        it('deve renderizar perguntas, respostas, justificativa e permitir recalcular score', () => {
            const onRecalculate = vi.fn();

            const { rerender } = render(
                <LeadScoringCardDetails
                    lead={mockLeadWithQA}
                    isRecalculating={false}
                    onRecalculate={onRecalculate}
                />
            );

            expect(screen.getByText(/Qual a sua meta?/)).toBeInTheDocument();
            expect(screen.getByText('Dobrar de faturamento')).toBeInTheDocument();
            expect(screen.getByText('Potencial cliente de alto ticket.')).toBeInTheDocument();

            const recalcBtn = screen.getByRole('button', { name: /Recalcular Score/i });
            fireEvent.click(recalcBtn);
            expect(onRecalculate).toHaveBeenCalled();

            // Rerender em estado recalculating
            rerender(
                <LeadScoringCardDetails
                    lead={mockLeadWithQA}
                    isRecalculating={true}
                    onRecalculate={onRecalculate}
                />
            );
            expect(screen.getByText(/Recalculando.../i)).toBeInTheDocument();
        });
    });

    describe('LeadScoringCard', () => {
        it('deve renderizar o card completo recolhido e expandido', () => {
            const mockLead = {
                id: 1,
                leads_table: 'leads_test',
                contato_nome: 'Julia Ramos',
                lead_score: 9,
                lead_classification: 'Morno ⚡',
                respostas_decoded: [{ pergunta: 'Dúvida?', resposta: 'Preço' }],
                lead_justification: 'Interessada no valor'
            };

            const { rerender } = render(
                <LeadScoringCard
                    lead={mockLead}
                    isExpanded={false}
                    isRecalculating={false}
                    isDeleting={false}
                    onToggleExpand={vi.fn()}
                    onRecalculate={vi.fn()}
                    onRequestDelete={vi.fn()}
                />
            );

            expect(screen.getByText('Julia Ramos')).toBeInTheDocument();
            expect(screen.queryByText(/Respostas de Qualificação/i)).not.toBeInTheDocument();

            rerender(
                <LeadScoringCard
                    lead={mockLead}
                    isExpanded={true}
                    isRecalculating={false}
                    isDeleting={false}
                    onToggleExpand={vi.fn()}
                    onRecalculate={vi.fn()}
                    onRequestDelete={vi.fn()}
                />
            );

            expect(screen.getByText(/Respostas de Qualificação/i)).toBeInTheDocument();
            expect(screen.getByText('Preço')).toBeInTheDocument();
        });
    });
});

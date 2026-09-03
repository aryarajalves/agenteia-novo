import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CRM from '../../components/CRM/index';
import CRMHeader from '../../components/CRM/components/CRMHeader';
import CRMColumn from '../../components/CRM/components/CRMColumn';
import CRMLeadCard from '../../components/CRM/components/CRMLeadCard';
import CRMBoard from '../../components/CRM/components/CRMBoard';
import CRMLeadDetailsModal from '../../components/CRM/components/CRMLeadDetailsModal';

describe('CRM Kanban Fullscreen & Date Filters', () => {
    const mockLead = {
        id: 101,
        contato_nome: 'Carlos Oliveira',
        telefone: '5511977776666',
        leads_table: 'leads',
        stage: 'comprou',
        source: 'template',
        mensagem: 'Já fiz o pagamento no pix!',
        lead_score: 90,
        lead_classification: 'Quente 🔥',
        labels: ['aluno'],
        created_at: new Date().toISOString()
    };

    it('renders CRMHeader with fullscreen close button, stats, search, and date filters', () => {
        const stats = {
            total_leads: 120,
            total_comprou: 15,
            total_em_atendimento: 35,
            total_remarketing: 20,
            conversion_rate: 12.5
        };

        const onDateFilterChangeMock = vi.fn();
        const onMonthChangeMock = vi.fn();
        const onCloseMock = vi.fn();

        render(
            <MemoryRouter>
                <CRMHeader
                    stats={stats}
                    search=""
                    onSearchChange={vi.fn()}
                    temperatureFilter="all"
                    onTemperatureChange={vi.fn()}
                    dateFilter="all"
                    onDateFilterChange={onDateFilterChangeMock}
                    selectedMonth=""
                    onMonthChange={onMonthChangeMock}
                    onRefresh={vi.fn()}
                    loading={false}
                    onClose={onCloseMock}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('CRM de Leads & Pipeline')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();

        // Botão de Voltar da tela cheia
        const closeBtn = screen.getByTitle(/Fechar CRM e voltar/i);
        expect(closeBtn).toBeInTheDocument();
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalled();

        // Verificar botões de período
        expect(screen.getByText('⚡ Hoje')).toBeInTheDocument();
        expect(screen.getByText('7 Dias')).toBeInTheDocument();
        expect(screen.getByText('14 Dias')).toBeInTheDocument();
        expect(screen.getByText('30 Dias')).toBeInTheDocument();
        expect(screen.getByText('Este Mês')).toBeInTheDocument();

        // Clicar em "⚡ Hoje"
        fireEvent.click(screen.getByText('⚡ Hoje'));
        expect(onDateFilterChangeMock).toHaveBeenCalledWith('today');
    });

    it('renders CRMLeadCard with direct WhatsApp/ZapVoice link', () => {
        render(
            <CRMLeadCard
                lead={mockLead}
                onClick={vi.fn()}
                onDragStart={vi.fn()}
            />
        );

        expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
        expect(screen.getByText('5511977776666')).toBeInTheDocument();
        expect(screen.getByText(/"Já fiz o pagamento no pix!"/i)).toBeInTheDocument();
    });

    it('renders CRMColumn with title and count badge', () => {
        render(
            <CRMColumn
                columnKey="comprou"
                title="Comprou (Alunos)"
                icon="🎉"
                badgeColor="#34d399"
                badgeBg="rgba(52, 211, 153, 0.15)"
                leads={[mockLead]}
                onLeadClick={vi.fn()}
                onLeadDrop={vi.fn()}
                onDragStart={vi.fn()}
            />
        );

        expect(screen.getByText('Comprou (Alunos)')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('opens confirmation modal and triggers onDeleteLead when clicking delete button', () => {
        const onDeleteMock = vi.fn();
        const onCloseMock = vi.fn();

        render(
            <CRMLeadDetailsModal
                lead={mockLead}
                onClose={onCloseMock}
                onStageChange={vi.fn()}
                onDeleteLead={onDeleteMock}
            />
        );

        expect(screen.getByText('Excluir Contato')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Excluir Contato'));

        // Modal de confirmação centralizado com backdrop
        expect(screen.getByText('Excluir Contato Permanentemente?')).toBeInTheDocument();
        expect(screen.getByText('Sim, Excluir')).toBeInTheDocument();

        // Clicar em confirmar exclusão
        fireEvent.click(screen.getByText('Sim, Excluir'));
        expect(onDeleteMock).toHaveBeenCalledWith(mockLead);
    });

    it('handles drag-to-scroll on CRMBoard', () => {
        const { container } = render(
            <CRMBoard
                columnsData={{ comprou: [mockLead] }}
                onLeadClick={vi.fn()}
                onLeadDrop={vi.fn()}
                onDragStart={vi.fn()}
            />
        );

        const board = container.querySelector('.crm-board');
        expect(board).toBeInTheDocument();

        // Mouse Down
        fireEvent.mouseDown(board, { button: 0, pageX: 200 });
        expect(board.classList.contains('is-dragging')).toBe(true);

        // Mouse Move
        fireEvent.mouseMove(board, { pageX: 100 });

        // Mouse Up
        fireEvent.mouseUp(board);
        expect(board.classList.contains('is-dragging')).toBe(false);
    });

    it('paginates leads at maximum 20 per page in CRMColumn', () => {
        // Criar lista de 25 leads
        const manyLeads = Array.from({ length: 25 }, (_, i) => ({
            id: 200 + i,
            contato_nome: `Lead Teste ${i + 1}`,
            telefone: `551198000${String(i).padStart(4, '0')}`,
            leads_table: 'leads',
            stage: 'retentativas',
            mensagem: 'Mensagem de teste',
            created_at: new Date().toISOString()
        }));

        render(
            <CRMColumn
                columnKey="retentativas"
                title="Re-tentativas"
                icon="🔁"
                badgeColor="#facc15"
                badgeBg="rgba(234, 179, 8, 0.15)"
                leads={manyLeads}
                onLeadClick={vi.fn()}
                onLeadDrop={vi.fn()}
                onDragStart={vi.fn()}
            />
        );

        // Página 1: Exibe do Lead 1 até Lead 20
        expect(screen.getByText('Lead Teste 1')).toBeInTheDocument();
        expect(screen.getByText('Lead Teste 20')).toBeInTheDocument();
        expect(screen.queryByText('Lead Teste 21')).not.toBeInTheDocument();

        // Info de paginação
        expect(screen.getByText('1-20 de 25')).toBeInTheDocument();
        expect(screen.getByText('1/2')).toBeInTheDocument();

        // Clicar em Próxima Página (▶)
        const nextBtn = screen.getByTitle('Próxima Página');
        fireEvent.click(nextBtn);

        // Página 2: Exibe Lead 21 até 25
        expect(screen.getByText('Lead Teste 21')).toBeInTheDocument();
        expect(screen.getByText('Lead Teste 25')).toBeInTheDocument();
        expect(screen.queryByText('Lead Teste 1')).not.toBeInTheDocument();
        expect(screen.getByText('21-25 de 25')).toBeInTheDocument();
        expect(screen.getByText('2/2')).toBeInTheDocument();
    });
});

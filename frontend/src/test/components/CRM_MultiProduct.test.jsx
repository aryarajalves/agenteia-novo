import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CRMHeader from '../../components/CRM/components/CRMHeader';
import CRMColumn from '../../components/CRM/components/CRMColumn';
import FollowupStepCard from '../../components/WebhookManager/components/EditWebhookTabs/FollowupStepCard';

describe('CRM Multi-Produto e Follow-up Unificado', () => {
    it('Deve renderizar o seletor de Funil/Produto no CRMHeader e disparar onProductChange', () => {
        const mockOnProductChange = vi.fn();
        const products = [
            { id: 'all', name: 'Todos os Produtos' },
            { id: '1', name: 'Laser Day (Entrada)' },
            { id: '2', name: 'Mentoria VIP' }
        ];

        render(
            <BrowserRouter>
                <CRMHeader
                    stats={{ total_leads: 10, total_comprou: 2, total_em_atendimento: 3, total_remarketing: 1, conversion_rate: 20 }}
                    products={products}
                    selectedProduct="all"
                    onProductChange={mockOnProductChange}
                    search=""
                    onSearchChange={vi.fn()}
                />
            </BrowserRouter>
        );

        expect(screen.getByText(/Funil:/i)).toBeInTheDocument();
        expect(screen.getByText(/Laser Day \(Entrada\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Mentoria VIP/i)).toBeInTheDocument();

        const selectElements = screen.getAllByRole('combobox');
        fireEvent.change(selectElements[0], { target: { value: '2' } });
        expect(mockOnProductChange).toHaveBeenCalledWith('2');
    });

    it('Deve exibir o botão de Disparo em Massa na coluna Comprou (Alunos)', () => {
        const mockMassDispatch = vi.fn();
        const mockLeads = [
            { id: 1, leads_table: 'leads', contato_nome: 'Aluno 1', telefone: '558599999999' }
        ];

        render(
            <CRMColumn
                columnKey="comprou"
                title="Comprou (Alunos)"
                icon="🎉"
                badgeColor="#34d399"
                badgeBg="rgba(52, 211, 153, 0.15)"
                leads={mockLeads}
                onLeadClick={vi.fn()}
                onLeadDrop={vi.fn()}
                onDragStart={vi.fn()}
                onMassDispatch={mockMassDispatch}
            />
        );

        const dispatchBtn = screen.getByRole('button', { name: /Disparar/i });
        expect(dispatchBtn).toBeInTheDocument();

        fireEvent.click(dispatchBtn);
        expect(mockMassDispatch).toHaveBeenCalledWith(mockLeads);
    });

    it('Deve renderizar o campo de Produto/Esteira e o público Compradores no FollowupStepCard', () => {
        const mockSetEditForm = vi.fn();
        const stepItem = {
            delay_minutes: 30,
            unit: 'minutes',
            value: 30,
            type: 'ai',
            target_audience: 'compradores',
            product_name: 'Mentoria VIP'
        };

        render(
            <FollowupStepCard
                stepIndex={0}
                stepItem={stepItem}
                safeEditForm={{ followup_steps: [stepItem] }}
                setEditForm={mockSetEditForm}
                setActiveFollowupStepTab={vi.fn()}
            />
        );

        expect(screen.getByText(/Produto\/Esteira:/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Mentoria VIP/i)).toBeInTheDocument();
        expect(screen.getByText(/Compradores \(Esteira Próximo Produto \/ Upsell\)/i)).toBeInTheDocument();
    });
});

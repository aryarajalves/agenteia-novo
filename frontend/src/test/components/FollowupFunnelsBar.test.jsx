import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FollowupFunnelsBar from '../../components/WebhookManager/components/EditWebhookTabs/FollowupFunnelsBar';

vi.mock('../../utils/helpers', () => ({
    showToast: vi.fn()
}));

describe('FollowupFunnelsBar Component', () => {
    let mockSafeEditForm;
    let mockSetEditForm;
    let mockSetActiveFunnelId;
    let mockSetActiveStepTab;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSafeEditForm = {
            followup_steps: [
                { step_index: 0, delay_minutes: 5, fixed_message: 'Passo Padrão 1' }
            ],
            followup_funnels: [
                {
                    id: 'followup_default',
                    name: 'Padrão / Principal',
                    is_default: true,
                    steps: [{ step_index: 0, delay_minutes: 5, fixed_message: 'Passo Padrão 1' }]
                },
                {
                    id: 'mentoria_vip',
                    name: 'Mentoria VIP',
                    is_default: false,
                    steps: [{ step_index: 0, delay_minutes: 10, fixed_message: 'Passo Mentoria 1' }]
                }
            ]
        };
        mockSetEditForm = vi.fn();
        mockSetActiveFunnelId = vi.fn();
        mockSetActiveStepTab = vi.fn();
    });

    it('deve renderizar o seletor com os fluxos cadastrados e badge padrão', () => {
        render(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="followup_default"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const select = screen.getByTestId('followup-funnels-select');
        expect(select).toBeInTheDocument();
        expect(select.value).toBe('followup_default');
        expect(screen.getByText('⭐ Padrão')).toBeInTheDocument();
        expect(screen.getByText(/Passos neste fluxo: 1/i)).toBeInTheDocument();
    });

    it('deve trocar de fluxo ao selecionar outra opção no dropdown', () => {
        render(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="followup_default"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const select = screen.getByTestId('followup-funnels-select');
        fireEvent.change(select, { target: { value: 'mentoria_vip' } });

        expect(mockSetActiveFunnelId).toHaveBeenCalledWith('mentoria_vip');
        expect(mockSetEditForm).toHaveBeenCalled();
        expect(mockSetActiveStepTab).toHaveBeenCalledWith(0);
    });

    it('deve abrir modal de criação e cadastrar um novo fluxo de produto', () => {
        render(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="followup_default"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const newBtn = screen.getByTestId('new-followup-funnel-btn');
        fireEvent.click(newBtn);

        expect(screen.getByTestId('modal-backdrop-create-funnel')).toBeInTheDocument();

        const nameInput = screen.getByTestId('new-followup-funnel-name-input');
        const idInput = screen.getByTestId('new-followup-funnel-id-input');

        fireEvent.change(nameInput, { target: { value: 'VSL Produto High' } });
        expect(idInput.value).toBe('vsl_produto_high');

        const submitBtn = screen.getByTestId('confirm-create-followup-funnel-btn');
        fireEvent.click(submitBtn);

        expect(mockSetActiveFunnelId).toHaveBeenCalledWith('vsl_produto_high');
        expect(mockSetEditForm).toHaveBeenCalledWith(
            expect.objectContaining({
                followup_funnels: expect.arrayContaining([
                    expect.objectContaining({ id: 'vsl_produto_high', name: 'VSL Produto High' })
                ])
            })
        );
    });

    it('deve abrir modal de renomear e atualizar o nome do fluxo atual', () => {
        render(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="mentoria_vip"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const renameBtn = screen.getByTestId('rename-followup-funnel-btn');
        fireEvent.click(renameBtn);

        expect(screen.getByTestId('modal-backdrop-rename-funnel')).toBeInTheDocument();

        const renameInput = screen.getByTestId('rename-followup-funnel-input');
        expect(renameInput.value).toBe('Mentoria VIP');

        fireEvent.change(renameInput, { target: { value: 'Mentoria Platinum' } });

        const confirmBtn = screen.getByTestId('confirm-rename-followup-funnel-btn');
        fireEvent.click(confirmBtn);

        expect(mockSetEditForm).toHaveBeenCalledWith(
            expect.objectContaining({
                followup_funnels: expect.arrayContaining([
                    expect.objectContaining({ id: 'mentoria_vip', name: 'Mentoria Platinum' })
                ])
            })
        );
    });

    it('não deve exibir botão de excluir no fluxo padrão, mas deve exibir no fluxo secundário', () => {
        const { rerender } = render(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="followup_default"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        expect(screen.queryByTestId('delete-followup-funnel-btn')).not.toBeInTheDocument();

        rerender(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="mentoria_vip"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        expect(screen.getByTestId('delete-followup-funnel-btn')).toBeInTheDocument();
    });

    it('deve abrir popup de exclusão e migrar contatos para fluxo padrão ao confirmar', () => {
        render(
            <FollowupFunnelsBar
                safeEditForm={mockSafeEditForm}
                setEditForm={mockSetEditForm}
                activeFollowupFunnelId="mentoria_vip"
                setActiveFollowupFunnelId={mockSetActiveFunnelId}
                setActiveFollowupStepTab={mockSetActiveStepTab}
            />
        );

        const deleteBtn = screen.getByTestId('delete-followup-funnel-btn');
        fireEvent.click(deleteBtn);

        expect(screen.getByTestId('modal-backdrop-delete-funnel')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja excluir o fluxo de follow-up/i)).toBeInTheDocument();

        const confirmDeleteBtn = screen.getByTestId('confirm-delete-followup-funnel-btn');
        fireEvent.click(confirmDeleteBtn);

        expect(mockSetActiveFunnelId).toHaveBeenCalledWith('followup_default');
        expect(mockSetEditForm).toHaveBeenCalledWith(
            expect.objectContaining({
                followup_funnels: expect.not.arrayContaining([
                    expect.objectContaining({ id: 'mentoria_vip' })
                ])
            })
        );
    });
});

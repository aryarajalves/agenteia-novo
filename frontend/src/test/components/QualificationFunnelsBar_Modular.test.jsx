import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vk } from 'vitest';
import '@testing-library/jest-dom';
import { FunnelsSelectControls } from '../../components/ConfigPanel/components/QualificationFunnelsBar/FunnelsSelectControls';
import { FunnelsInfoFooter } from '../../components/ConfigPanel/components/QualificationFunnelsBar/FunnelsInfoFooter';

describe('FunnelsSelectControls Component', () => {
    const mockFunnels = [
        { id: 'funnel_default', name: 'Padrão', is_default: true },
        { id: 'funnel_vip', name: 'VIP', is_default: false }
    ];

    it('deve renderizar controles de seleção e responder a mudanças e cliques', () => {
        const onSelectMock = vi.fn();
        const onCreateMock = vi.fn();
        const onRenameMock = vi.fn();
        const onDeleteMock = vi.fn();

        render(
            <FunnelsSelectControls
                funnels={mockFunnels}
                currentFunnel={mockFunnels[1]}
                activeFunnelId="funnel_vip"
                onSelectFunnel={onSelectMock}
                onOpenCreate={onCreateMock}
                onOpenRename={onRenameMock}
                onOpenDelete={onDeleteMock}
            />
        );

        // Select
        const select = screen.getByTestId('funnels-select');
        expect(select).toBeInTheDocument();
        fireEvent.change(select, { target: { value: 'funnel_default' } });
        expect(onSelectMock).toHaveBeenCalledWith('funnel_default');

        // Botões
        fireEvent.click(screen.getByTestId('new-funnel-btn'));
        expect(onCreateMock).toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('rename-funnel-btn'));
        expect(onRenameMock).toHaveBeenCalled();

        // Como não é default, o botão excluir deve estar visível
        const deleteBtn = screen.getByTestId('delete-funnel-btn');
        expect(deleteBtn).toBeInTheDocument();
        fireEvent.click(deleteBtn);
        expect(onDeleteMock).toHaveBeenCalled();
    });

    it('não deve exibir botão excluir nem selo padrão para funil customizado', () => {
        render(
            <FunnelsSelectControls
                funnels={mockFunnels}
                currentFunnel={mockFunnels[0]}
                activeFunnelId="funnel_default"
                onSelectFunnel={() => {}}
                onOpenCreate={() => {}}
                onOpenRename={() => {}}
                onOpenDelete={() => {}}
            />
        );

        expect(screen.getAllByText(/Padrão/i).length).toBeGreaterThan(0);
        expect(screen.queryByTestId('delete-funnel-btn')).not.toBeInTheDocument();
    });
});

describe('FunnelsInfoFooter Component', () => {
    it('deve exibir id do funil e total de etapas', () => {
        render(
            <FunnelsInfoFooter
                currentFunnelId="funnel_vip"
                questionsCount={5}
            />
        );

        expect(screen.getByText(/funnel_id: "funnel_vip"/i)).toBeInTheDocument();
        expect(screen.getByText(/Total de etapas neste funil: 5/i)).toBeInTheDocument();
    });
});

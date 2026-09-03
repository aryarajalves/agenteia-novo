import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CacheThresholdControl from '../../components/ConfigPanel/components/Modals/CacheThresholdControl';
import CacheItemCard from '../../components/ConfigPanel/components/SemanticCache/CacheItemCard';

describe('CacheThresholdControl & CacheItemCard Tests', () => {
    it('deve alternar entre modo padrão e personalizado no CacheThresholdControl', () => {
        const mockOnChange = vi.fn();
        render(
            <CacheThresholdControl
                value={null}
                onChange={mockOnChange}
                defaultThreshold={92}
            />
        );

        expect(screen.getByText(/Padrão do Agente \(92%\)/i)).toBeInTheDocument();

        // Clicar em personalizado
        const customBtn = screen.getByTestId('threshold-mode-custom-btn');
        fireEvent.click(customBtn);

        expect(mockOnChange).toHaveBeenCalledWith(0.98);

        // Mudar slider
        const slider = screen.getByTestId('cache-threshold-slider');
        fireEvent.change(slider, { target: { value: '95' } });
        expect(mockOnChange).toHaveBeenCalledWith(0.95);

        // Voltar para padrão
        const defaultBtn = screen.getByTestId('threshold-mode-default-btn');
        fireEvent.click(defaultBtn);
        expect(mockOnChange).toHaveBeenCalledWith(null);
    });

    it('deve renderizar badge personalizado no CacheItemCard quando item tem similarity_threshold', () => {
        const itemCustom = {
            id: 10,
            user_query: 'quanto custa?',
            approved_response: 'R$ 297',
            usage_count: 5,
            is_active: true,
            similarity_threshold: 0.98
        };

        render(
            <CacheItemCard
                item={itemCustom}
                onEdit={vi.fn()}
                onToggle={vi.fn()}
                onDelete={vi.fn()}
                defaultThreshold={92}
            />
        );

        const badge = screen.getByTestId('cache-similarity-badge-10');
        expect(badge).toHaveTextContent(/98% \(Personalizado\)/i);
    });

    it('deve renderizar badge padrão no CacheItemCard quando similarity_threshold for nulo', () => {
        const itemDefault = {
            id: 20,
            user_query: 'como funciona?',
            approved_response: 'Online',
            usage_count: 2,
            is_active: true,
            similarity_threshold: null
        };

        render(
            <CacheItemCard
                item={itemDefault}
                onEdit={vi.fn()}
                onToggle={vi.fn()}
                onDelete={vi.fn()}
                defaultThreshold={85}
            />
        );

        const badge = screen.getByTestId('cache-similarity-badge-20');
        expect(badge).toHaveTextContent(/Padrão \(85%\)/i);
    });
});

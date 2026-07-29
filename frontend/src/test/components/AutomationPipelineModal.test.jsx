import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AutomationPipelineModal from '../../components/WebhookManager/components/AutomationPipelineModal';

// Mock do módulo de config
vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:5000'
}));

describe('AutomationPipelineModal Component', () => {
    let mockOnClose;

    beforeEach(() => {
        mockOnClose = vi.fn();
    });

    it('deve exibir o indicador "Processando Automação..." quando o status do evento for "processing"', () => {
        const mockEvent = {
            id: 1,
            webhook_config_id: 10,
            status: 'processing',
            created_at: new Date().toISOString(),
            processing_steps: JSON.stringify([
                { step: 'Memória de Contexto', detail: 'Injetadas 1 interações', timestamp: new Date().toISOString() }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText('⚙️ Processando Automação...')).toBeInTheDocument();
        expect(screen.getByText('Executando fluxos subsequentes. Aguarde a conclusão da automação.')).toBeInTheDocument();
    });

    it('não deve exibir o indicador "Processando Automação..." quando o status do evento for "completed"', () => {
        const mockEvent = {
            id: 2,
            webhook_config_id: 10,
            status: 'completed',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([
                { step: 'Memória de Contexto', detail: 'Injetadas 1 interações', timestamp: '2026-05-18T10:07:35Z' }
            ])
        };

        render(
            <AutomationPipelineModal
                event={mockEvent}
                onClose={mockOnClose}
            />
        );

        expect(screen.queryByText('⚙️ Processando Automação...')).not.toBeInTheDocument();
    });
});

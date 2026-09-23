import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import AiStatusBadge from '../../../components/WebhookManager/components/LeadHistoryModal/components/TableRow/AiStatusBadge';
import RowActionsCell from '../../../components/WebhookManager/components/LeadHistoryModal/components/TableRow/RowActionsCell';

describe('LeadHistoryTableRow Modular Subcomponents', () => {
    describe('AiStatusBadge', () => {
        it('deve exibir "Absorvida pela próxima" quando isGrouped for true', () => {
            render(<AiStatusBadge event={{ status: 'waiting' }} isGrouped={true} />);
            expect(screen.getByText('Absorvida pela próxima')).toBeInTheDocument();
        });

        it('deve exibir "Modo Silencioso (IA Desativada)" para memory ou ignored_silent', () => {
            render(<AiStatusBadge event={{ event_type: 'memory', status: 'ignored_silent' }} isGrouped={false} />);
            expect(screen.getByText(/Modo Silencioso/i)).toBeInTheDocument();
        });

        it('deve exibir "Pausado pelo Pre-Router" para ignored ou handoff', () => {
            render(<AiStatusBadge event={{ status: 'ignored', processing_steps: 'Pre-Router blocked' }} isGrouped={false} />);
            expect(screen.getByText(/Pausado pelo Pre-Router/i)).toBeInTheDocument();
        });

        it('deve exibir "Processando Resposta..." para waiting ou processing', () => {
            render(<AiStatusBadge event={{ status: 'processing' }} isGrouped={false} />);
            expect(screen.getByText(/Processando Resposta\.\.\./i)).toBeInTheDocument();
        });

        it('deve exibir "Falha na Geração" para status error', () => {
            render(<AiStatusBadge event={{ status: 'error' }} isGrouped={false} />);
            expect(screen.getByText(/Falha na Geração/i)).toBeInTheDocument();
        });
    });

    describe('RowActionsCell', () => {
        it('deve acionar handleRetryEvent e handleDeleteEvent nos cliques respectivos', () => {
            const handleRetryMock = vi.fn();
            const handleDeleteMock = vi.fn();

            render(
                <table>
                    <tbody>
                        <tr>
                            <RowActionsCell
                                event={{ id: 99, event_type: 'message' }}
                                isAgent={false}
                                isGrouped={false}
                                isFollowUp={false}
                                isTemplate={false}
                                message="Dúvida lead"
                                isRetrying={false}
                                isProcessingAndNotStuck={false}
                                handleRetryEvent={handleRetryMock}
                                setSelectedPipelineEvent={vi.fn()}
                                onSaveToCache={vi.fn()}
                                handleDeleteEvent={handleDeleteMock}
                            />
                        </tr>
                    </tbody>
                </table>
            );

            const retryBtn = screen.getByTitle(/Reiniciar Automação/i);
            fireEvent.click(retryBtn);
            expect(handleRetryMock).toHaveBeenCalledWith(99);

            const deleteBtn = screen.getByTitle('Excluir');
            fireEvent.click(deleteBtn);
            expect(handleDeleteMock).toHaveBeenCalledWith(99);
        });
    });
});

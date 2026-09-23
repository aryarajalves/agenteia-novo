import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PipelineStepDiagnostic from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepDiagnostic';
import PipelineStepQualificationInfo from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepQualificationInfo';
import PipelineStepCardHeader from '../../components/WebhookManager/components/AutomationPipelineModal/components/PipelineStepCardHeader';

describe('PipelineStepCard Modular Components', () => {
    describe('PipelineStepDiagnostic', () => {
        it('deve retornar null se diagnostic for nulo', () => {
            const { container } = render(<PipelineStepDiagnostic diagnostic={null} />);
            expect(container.firstChild).toBeNull();
        });

        it('deve renderizar o título, dica e ação sugerida', () => {
            const diagnostic = {
                title: 'Erro de Conexão com API',
                tip: 'Verifique a chave de API e a conectividade de rede.',
                action: 'Atualizar Credenciais'
            };
            render(<PipelineStepDiagnostic diagnostic={diagnostic} />);
            expect(screen.getByText('Erro de Conexão com API')).toBeInTheDocument();
            expect(screen.getByText('Verifique a chave de API e a conectividade de rede.')).toBeInTheDocument();
            expect(screen.getByText('Ação Sugerida: Atualizar Credenciais')).toBeInTheDocument();
        });
    });

    describe('PipelineStepQualificationInfo', () => {
        it('deve retornar null se metadata for nulo', () => {
            const { container } = render(<PipelineStepQualificationInfo metadata={null} />);
            expect(container.firstChild).toBeNull();
        });

        it('deve renderizar as etiquetas aplicadas e removidas', () => {
            const metadata = {
                labels_applied: ['Interessado', 'VIP'],
                labels_removed: ['Frio']
            };
            render(<PipelineStepQualificationInfo metadata={metadata} />);
            expect(screen.getByText(/Interessado/)).toBeInTheDocument();
            expect(screen.getByText(/VIP/)).toBeInTheDocument();
            expect(screen.getByText(/Removidas: Frio/)).toBeInTheDocument();
        });

        it('deve renderizar fallback quando não há etiquetas aplicadas', () => {
            const metadata = {
                labels_applied: [],
                lead_classification: 'Morno'
            };
            render(<PipelineStepQualificationInfo metadata={metadata} />);
            expect(screen.getByText(/Nenhuma etiqueta aplicada \(Lead Morno\)/)).toBeInTheDocument();
        });
    });

    describe('PipelineStepCardHeader', () => {
        const defaultProps = {
            step: {
                icon: '⚡',
                title: 'Etapa de Processamento',
                durationFormatted: '120ms',
                timestampFormatted: '10:45:00',
                metadata: {
                    model: 'gpt-5',
                    usage: { total_tokens: 350 },
                    cost: 0.0015
                }
            },
            isCollapsed: false,
            setIsCollapsed: vi.fn(),
            isError: false,
            isCacheHit: false,
            isCachePartial: false,
            isCacheMiss: false,
            isQualifiedStep: false,
            copied: false,
            handleCopyStep: vi.fn(),
            onMaximize: vi.fn()
        };

        it('deve renderizar o título, badges e botão de copiar', () => {
            render(<PipelineStepCardHeader {...defaultProps} />);
            expect(screen.getByText('Etapa de Processamento')).toBeInTheDocument();
            expect(screen.getByText(/gpt-5/)).toBeInTheDocument();
            expect(screen.getByText(/350 tok/)).toBeInTheDocument();
            expect(screen.getByText(/R\$ 0.0015/)).toBeInTheDocument();
            expect(screen.getByText('Copiar')).toBeInTheDocument();
        });

        it('deve alternar collapse ao clicar no cabeçalho', () => {
            render(<PipelineStepCardHeader {...defaultProps} />);
            fireEvent.click(screen.getByText('Etapa de Processamento'));
            expect(defaultProps.setIsCollapsed).toHaveBeenCalledWith(true);
        });

        it('deve acionar handleCopyStep ao clicar no botão Copiar', () => {
            render(<PipelineStepCardHeader {...defaultProps} />);
            fireEvent.click(screen.getByText('Copiar'));
            expect(defaultProps.handleCopyStep).toHaveBeenCalled();
        });
    });
});


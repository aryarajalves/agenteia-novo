import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import TrainingModalHeader from '../../components/TranscriptionHistory/components/TrainingModal/components/TrainingModalHeader';
import TrainingMetadataSection from '../../components/TranscriptionHistory/components/TrainingModal/components/TrainingMetadataSection';
import TrainingCardItem from '../../components/TranscriptionHistory/components/TrainingModal/components/TrainingCardItem';
import TrainingCardsList from '../../components/TranscriptionHistory/components/TrainingModal/components/TrainingCardsList';
import TrainingLoadingOverlay from '../../components/TranscriptionHistory/components/TrainingModal/components/TrainingLoadingOverlay';
import TrainingModalFooter from '../../components/TranscriptionHistory/components/TrainingModal/components/TrainingModalFooter';
import TrainingModal from '../../components/TranscriptionHistory/components/TrainingModal';
import { TranscriptionProvider } from '../../components/TranscriptionHistory/TranscriptionContext';

vi.mock('../../../api/client', () => ({
    api: {
        get: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ id: 'gpt-4o-mini', provider: 'openai' }] })
        })),
        post: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
        }))
    }
}));

describe('TrainingModal Subcomponents', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('TrainingModalHeader deve renderizar título e o nome do arquivo', () => {
        render(<TrainingModalHeader filename="aula_vendas_01.mp4" />);
        expect(screen.getByText('Treinamento com IA')).toBeInTheDocument();
        expect(screen.getByText('aula_vendas_01.mp4')).toBeInTheDocument();
    });

    it('TrainingMetadataSection deve alternar visibilidade e exibir campos', () => {
        const setShowMetadata = vi.fn();
        const { rerender } = render(
            <TrainingMetadataSection
                showMetadata={false}
                setShowMetadata={setShowMetadata}
                metaVideoName=""
                setMetaVideoName={vi.fn()}
                metaModule=""
                setMetaModule={vi.fn()}
                metaChapter=""
                setMetaChapter={vi.fn()}
                metadataVal="Vídeo: aula.mp4"
            />
        );

        const toggleBtn = screen.getByRole('button', { name: /Metadados do Vídeo/i });
        fireEvent.click(toggleBtn);
        expect(setShowMetadata).toHaveBeenCalled();

        // Rerender com showMetadata = true
        rerender(
            <TrainingMetadataSection
                showMetadata={true}
                setShowMetadata={setShowMetadata}
                metaVideoName="Aula 1"
                setMetaVideoName={vi.fn()}
                metaModule="Módulo 2"
                setMetaModule={vi.fn()}
                metaChapter="Capítulo 3"
                setMetaChapter={vi.fn()}
                metadataVal="Vídeo: Aula 1 | Módulo: Módulo 2 | Capítulo: Capítulo 3"
            />
        );

        expect(screen.getByPlaceholderText('Ex: Introdução ao Funil de Vendas')).toHaveValue('Aula 1');
        expect(screen.getByText('Vídeo: Aula 1 | Módulo: Módulo 2 | Capítulo: Capítulo 3')).toBeInTheDocument();
    });

    it('TrainingCardItem deve exibir pergunta e resposta e disparar remoção', () => {
        const onFieldChange = vi.fn();
        const onRemove = vi.fn();
        const item = {
            localId: 'qa-1',
            question: 'Qual o valor?',
            answer: 'R$ 97,00',
            category: 'Treinamento',
            isDuplicate: false
        };

        render(
            <TrainingCardItem
                item={item}
                index={0}
                isQaMode={true}
                onFieldChange={onFieldChange}
                onRemove={onRemove}
            />
        );

        expect(screen.getByDisplayValue('Qual o valor?')).toBeInTheDocument();
        expect(screen.getByDisplayValue('R$ 97,00')).toBeInTheDocument();

        const removeBtn = screen.getByTitle('Remover');
        fireEvent.click(removeBtn);
        expect(onRemove).toHaveBeenCalledWith('qa-1');
    });

    it('TrainingLoadingOverlay deve renderizar quando isGenerating ou isSaving estiver ativo', () => {
        const { rerender } = render(
            <TrainingLoadingOverlay
                isGenerating={false}
                isSaving={false}
                isQaMode={true}
            />
        );
        expect(screen.queryByText(/Analisando com IA/i)).not.toBeInTheDocument();

        rerender(
            <TrainingLoadingOverlay
                isGenerating={true}
                isSaving={false}
                isQaMode={true}
            />
        );
        expect(screen.getByText('🧠 Analisando com IA...')).toBeInTheDocument();

        rerender(
            <TrainingLoadingOverlay
                isGenerating={false}
                isSaving={true}
                isQaMode={true}
            />
        );
        expect(screen.getByText('💾 Gravando na Base de Conhecimento...')).toBeInTheDocument();
    });

    it('TrainingModalFooter deve renderizar custos e botões de ação', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();

        render(
            <TrainingModalFooter
                usedLlmModel="gpt-4o-mini"
                generationCostBrl={0.05}
                generationCostUsd={0.01}
                isGenerating={false}
                isSaving={false}
                qaListLength={3}
                hasDuplicates={false}
                onClose={onClose}
                onSave={onSave}
            />
        );

        expect(screen.getByText(/gpt-4o-mini/i)).toBeInTheDocument();
        expect(screen.getByText(/Custo: R\$ 0.05/i)).toBeInTheDocument();

        const saveBtn = screen.getByText('Salvar na Base de Conhecimento 🚀');
        fireEvent.click(saveBtn);
        expect(onSave).toHaveBeenCalled();

        const closeBtn = screen.getByText('Fechar');
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });
});

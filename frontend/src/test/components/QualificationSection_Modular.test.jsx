import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualificationSubTabsNav } from '../../components/ConfigPanel/components/QualificationSection/QualificationSubTabsNav';
import { QualificationLabelsTab } from '../../components/ConfigPanel/components/QualificationSection/QualificationLabelsTab';
import { QualificationScoringTab } from '../../components/ConfigPanel/components/QualificationSection/QualificationScoringTab';

describe('QualificationSubTabsNav Component', () => {
    it('deve renderizar as 4 sub-abas e responder ao clique de troca', () => {
        const setActiveSubTabMock = vi.fn();
        const configMock = {
            qualification_lead_scoring_enabled: true,
            qualification_scoring_criteria: 'Critério de teste',
            qualification_stages: [{ id: '1', name: 'Estágio 1' }],
            qualification_actions: { on_qualified: { add_tags: ['lead'] } }
        };

        render(
            <QualificationSubTabsNav
                activeSubTab="stages"
                setActiveSubTab={setActiveSubTabMock}
                config={configMock}
                isLeadQualificadoActive={false}
            />
        );

        const stagesTab = screen.getByTestId('subtab-funnel-stages');
        const labelsTab = screen.getByTestId('subtab-funnel-labels');
        const finalActionTab = screen.getByTestId('subtab-funnel-final-action');
        const scoringTab = screen.getByTestId('subtab-funnel-scoring');

        expect(stagesTab).toBeDefined();
        expect(labelsTab).toBeDefined();
        expect(finalActionTab).toBeDefined();
        expect(scoringTab).toBeDefined();

        fireEvent.click(labelsTab);
        expect(setActiveSubTabMock).toHaveBeenCalledWith('labels');

        fireEvent.click(scoringTab);
        expect(setActiveSubTabMock).toHaveBeenCalledWith('scoring');
    });

    it('deve exibir badge de Definido quando lead scoring tiver critérios preenchidos', () => {
        render(
            <QualificationSubTabsNav
                activeSubTab="scoring"
                setActiveSubTab={() => {}}
                hasCriteria={true}
            />
        );

        expect(screen.getByText('Definido')).toBeDefined();
    });
});

describe('QualificationLabelsTab Component', () => {
    it('deve exibir estado de carregamento quando isLoadingLabels for true', () => {
        render(
            <QualificationLabelsTab
                isLoadingLabels={true}
                chatwootLabels={[]}
                config={{}}
                setConfig={() => {}}
            />
        );

        expect(screen.getByText(/Carregando etiquetas do ZapVoice/i)).toBeDefined();
    });

    it('deve renderizar o componente ChatwootLabelMultiSelect quando não estiver carregando', () => {
        const setConfigMock = vi.fn();
        render(
            <QualificationLabelsTab
                isLoadingLabels={false}
                chatwootLabels={['cliente', 'vip']}
                config={{ qualification_labels_to_qualify: ['cliente'] }}
                setConfig={setConfigMock}
            />
        );

        expect(screen.getByText('🏷️ Etiquetas do ZapVoice')).toBeDefined();
    });
});

describe('QualificationScoringTab Component', () => {
    it('deve renderizar campos de Lead Scoring e permitir alteração de critérios', () => {
        const setQualificationCriteriaMock = vi.fn();
        const onOpenCriteriaModalMock = vi.fn();

        render(
            <QualificationScoringTab
                qualificationCriteria="Critério inicial"
                setQualificationCriteria={setQualificationCriteriaMock}
                onOpenCriteriaModal={onOpenCriteriaModalMock}
            />
        );

        expect(screen.getByText(/Diretrizes e Critérios do Lead Scoring/i)).toBeDefined();

        const maximizeBtn = screen.getByRole('button', { name: /Maximizar/i });
        fireEvent.click(maximizeBtn);
        expect(onOpenCriteriaModalMock).toHaveBeenCalled();

        const textarea = screen.getByPlaceholderText(/Defina as regras de negócio|Avalie o lead/i);
        expect(textarea.value).toBe('Critério inicial');

        fireEvent.change(textarea, { target: { value: 'Novo critério avaliado' } });
        expect(setQualificationCriteriaMock).toHaveBeenCalledWith('Novo critério avaliado');
    });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vk } from 'vitest';
import '@testing-library/jest-dom';
import { CreateCacheModalHeader } from '../../components/ConfigPanel/components/Modals/CreateSemanticCacheModal/CreateCacheModalHeader';
import { CreateCacheNewForm } from '../../components/ConfigPanel/components/Modals/CreateSemanticCacheModal/CreateCacheNewForm';

describe('CreateCacheModalHeader Component', () => {
    it('deve renderizar as abas e alterar o modo ao clicar', () => {
        const setModeMock = vi.fn();
        const onCloseMock = vi.fn();

        render(
            <CreateCacheModalHeader
                mode="new"
                setMode={setModeMock}
                onClose={onCloseMock}
                isSaving={false}
            />
        );

        const linkTab = screen.getByTestId('tab-mode-link');
        fireEvent.click(linkTab);
        expect(setModeMock).toHaveBeenCalledWith('link');

        const newTab = screen.getByTestId('tab-mode-new');
        fireEvent.click(newTab);
        expect(setModeMock).toHaveBeenCalledWith('new');

        const closeBtn = screen.getByText('✕');
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalled();
    });
});

describe('CreateCacheNewForm Component', () => {
    it('deve disparar on-maximize-response e on-close ao clicar nos botõesc', () => {
        const onMaximizeMock = vi.fn();
        const onCloseMock = vi.fn();
        const onSubmitMock = vi.fn();

        render(
            <CreateCacheNewForm
                userQuery="Qual o valor?"
                setUserQuery={() => {}}
                alternateQueries={[]}
                setAlternateQueries={() => {}}
                categoryTag=""
                setCategoryTag={() => {}}
                similarityThreshold={null}
                setSimilarityThreshold={() => {}}
                defaultThreshold={92}
                approvedResponse="Custa R${ 297,00}"
                setApprovedResponse={() => {}}
                agentId="1"
                isSaving={false}
                onMaximizeResponse={onMaximizeMock}
                onSubmit={onSubmitMock}
                onClose={onCloseMock}
            />
        );

        const maximizeBtn = screen.getByTestId('toggle-maximize-create-response-btn');
        fireEvent.click(maximizeBtn);
        expect(onMaximizeMock).toHaveBeenCalled();

        const cancelBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelBtn);
        expect(onCloseMock).toHaveBeenCalled();
    });
});

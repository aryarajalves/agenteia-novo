import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import SimulatorSearchLoadingModal from '../../components/KnowledgeBaseManager/components/SimulatorSearchLoadingModal';

describe('SimulatorSearchLoadingModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('não renderiza nada quando isOpen é false', () => {
        const { container } = render(
            <SimulatorSearchLoadingModal isOpen={false} query="quanto custa o curso?" />
        );

        expect(screen.queryByTestId('sim-search-loading-modal')).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o popup centralizado com título e animação quando isOpen é true', () => {
        render(
            <SimulatorSearchLoadingModal 
                isOpen={true} 
                query="quanto custa o curso?" 
            />
        );

        const modal = screen.getByTestId('sim-search-loading-modal');
        expect(modal).toBeInTheDocument();
        expect(screen.getByText(/Buscando na Base de Conhecimento\.\.\./i)).toBeInTheDocument();
        expect(screen.getByText(/busca semântica vetorial e avaliando filtros de IA/i)).toBeInTheDocument();
    });

    it('exibe a pergunta buscada no badge de consulta', () => {
        render(
            <SimulatorSearchLoadingModal 
                isOpen={true} 
                query="como funciona o parcelamento no cartão?" 
            />
        );

        const queryBadge = screen.getByTestId('sim-search-loading-query');
        expect(queryBadge).toBeInTheDocument();
        expect(queryBadge).toHaveTextContent(/como funciona o parcelamento no cartão\?/i);
    });

    it('exibe os chips de filtros de IA que estão ativos no momento', () => {
        const activeConfig = {
            translation: true,
            multiQuery: false,
            rerank: true,
            agenticEval: true,
            parentExpansion: false
        };

        render(
            <SimulatorSearchLoadingModal 
                isOpen={true} 
                query="qual o prazo?" 
                config={activeConfig}
            />
        );

        expect(screen.getByTestId('sim-search-active-filters')).toBeInTheDocument();
        expect(screen.getByText(/⚡ Tradução/i)).toBeInTheDocument();
        expect(screen.getByText(/⚡ Rerank IA/i)).toBeInTheDocument();
        expect(screen.getByText(/⚡ Avaliação Agêntica/i)).toBeInTheDocument();
        expect(screen.queryByText(/⚡ Multi-Query/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/⚡ Expansão de Contexto/i)).not.toBeInTheDocument();
    });
});

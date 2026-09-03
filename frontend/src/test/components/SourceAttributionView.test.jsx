import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SourceAttributionView from '../../components/ChatPlayground/components/MessageBubbleModules/SourceAttributionView';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

const mockData = {
    summary: 'A resposta utilizou 1 item da Base de Conhecimento e 1 regra do Prompt.',
    segments: [
        {
            segment_index: 1,
            text: 'O curso é ministrado pela Tarcira Martins com 17 anos de experiência.',
            source_type: 'knowledge_base',
            source_title: 'Base de Conhecimento: Sobre a Professora',
            source_snippet: 'Perg: Quem é Tarcira?\nResp: Tarcira tem 17 anos de experiência.',
            kb_id: 1,
            kb_item_id: 10,
            explanation: 'Extraído diretamente da base de conhecimento.',
            link: {
                type: 'knowledge_base',
                url: '/knowledge-bases/1',
                label: 'Abrir Base de Conhecimento #1'
            }
        },
        {
            segment_index: 2,
            text: 'Podemos oferecer 20% de desconto.',
            source_type: 'system_prompt',
            source_title: 'Prompt do Agente: Política de Desconto',
            source_snippet: 'Ofereça até 20% de desconto caso o cliente hesite.',
            agent_id: 5,
            explanation: 'Regra de desconto configurada no prompt.',
            link: {
                type: 'agent_prompt',
                url: '/agent/5',
                label: 'Editar Prompt do Agente'
            }
        }
    ]
};

describe('SourceAttributionView Component', () => {
    it('não deve renderizar nada se o estado for idle', () => {
        const { container } = render(
            <MemoryRouter>
                <SourceAttributionView attributionState="idle" />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve exibir indicador de carregamento quando o estado for loading', () => {
        render(
            <MemoryRouter>
                <SourceAttributionView attributionState="loading" />
            </MemoryRouter>
        );
        expect(screen.getByTestId('attribution-loading')).toBeInTheDocument();
        expect(screen.getByText(/Analisando origem e citações/i)).toBeInTheDocument();
    });

    it('deve exibir mensagem de erro e botão de retry', () => {
        const handleFetch = vi.fn();
        render(
            <MemoryRouter>
                <SourceAttributionView attributionState="error" handleFetchAttribution={handleFetch} />
            </MemoryRouter>
        );
        expect(screen.getByText(/Não foi possível carregar o mapeamento/i)).toBeInTheDocument();
        const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i });
        fireEvent.click(retryBtn);
        expect(handleFetch).toHaveBeenCalled();
    });

    it('deve renderizar segmentos com badges, snippets e botões de link', () => {
        render(
            <MemoryRouter>
                <SourceAttributionView
                    attributionState="done"
                    attributionData={mockData}
                    selectedAgentId={5}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Mapeamento de Fontes & Citações/i)).toBeInTheDocument();
        expect(screen.getByTestId('attribution-summary')).toHaveTextContent(/A resposta utilizou 1 item da Base/i);

        // Segmento 1 (Knowledge Base)
        const seg0 = screen.getByTestId('source-segment-0');
        expect(seg0).toBeInTheDocument();
        expect(seg0).toHaveTextContent(/Base de Conhecimento/i);
        expect(seg0).toHaveTextContent(/O curso é ministrado pela Tarcira Martins/i);
        expect(seg0).toHaveTextContent(/Perg: Quem é Tarcira/i);

        // Botão de link para Base de Conhecimento
        const kbBtn = screen.getByRole('button', { name: /Abrir Base de Conhecimento #1/i });
        expect(kbBtn).toBeInTheDocument();
        fireEvent.click(kbBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/knowledge-bases/1');

        // Segmento 2 (Prompt)
        const seg1 = screen.getByTestId('source-segment-1');
        expect(seg1).toBeInTheDocument();
        expect(seg1).toHaveTextContent(/Prompt do Agente/i);
        const promptBtn = screen.getByRole('button', { name: /Editar Prompt do Agente/i });
        expect(promptBtn).toBeInTheDocument();
        fireEvent.click(promptBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/agent/5');
    });
});

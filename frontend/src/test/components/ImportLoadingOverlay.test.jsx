import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImportLoadingOverlay from '../../components/ImportLoadingOverlay';

describe('ImportLoadingOverlay Component', () => {
    it('não deve renderizar nada quando isOpen for false', () => {
        const { container } = render(
            <ImportLoadingOverlay isOpen={false} />
        );
        expect(screen.queryByTestId('import-loading-overlay')).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar o overlay centralizado com título e mensagem padrão quando isOpen for true', () => {
        render(
            <ImportLoadingOverlay isOpen={true} />
        );
        
        const overlay = screen.getByTestId('import-loading-overlay');
        expect(overlay).toBeInTheDocument();
        expect(screen.getByText('Importando Perguntas e Respostas...')).toBeInTheDocument();
        expect(screen.getByText(/Processando o arquivo JSON/i)).toBeInTheDocument();
        expect(screen.getByText('🧠')).toBeInTheDocument();
    });

    it('deve renderizar título, mensagem e ícone customizados quando fornecidos', () => {
        render(
            <ImportLoadingOverlay 
                isOpen={true} 
                title="Processando Arquivo Customizado"
                message="Aguarde o processamento dos dados JSON."
                icon="⚡"
            />
        );
        
        expect(screen.getByText('Processando Arquivo Customizado')).toBeInTheDocument();
        expect(screen.getByText('Aguarde o processamento dos dados JSON.')).toBeInTheDocument();
        expect(screen.getByText('⚡')).toBeInTheDocument();
    });
});

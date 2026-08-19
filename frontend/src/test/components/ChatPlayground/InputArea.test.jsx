import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputArea from '../../../components/ChatPlayground/components/InputArea';

const mockProps = {
    input: '',
    setInput: vi.fn(),
    loading: false,
    isRecording: false,
    isInputExpanded: false,
    setIsInputExpanded: vi.fn(),
    handleSendMessage: vi.fn(),
    handleVoiceRecord: vi.fn(),
    imagePreview: null,
    selectedImage: null,
    isUploading: false,
    handleRemoveImage: vi.fn(),
    handleImageSelect: vi.fn(),
    fileInputRef: { current: null },
    sessionId: 'session-123',
    isRegularUser: false,
    isViewMode: false,
    isTesterAutoRunning: false,
    fetchSummary: vi.fn(),
    fetchQuestions: vi.fn(),
    hasTesterReport: false,
    fetchTestReport: vi.fn()
};

describe('InputArea Component - Image Preview', () => {
    it('deve renderizar o preview da imagem quando imagePreview for fornecido', () => {
        const props = {
            ...mockProps,
            imagePreview: 'blob:http://localhost:5300/image-uuid',
            selectedImage: { name: 'test-image.png', size: 102400 } // 100 KB
        };

        render(<InputArea {...props} />);

        // Verifica se a imagem de preview está no documento
        const img = screen.getByAltText('Preview');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'blob:http://localhost:5300/image-uuid');

        // Verifica se o nome e o tamanho do arquivo são exibidos
        expect(screen.getByText('test-image.png')).toBeInTheDocument();
        expect(screen.getByText('100.0 KB')).toBeInTheDocument();
    });

    it('deve exibir o spinner de upload quando isUploading for verdadeiro', () => {
        const props = {
            ...mockProps,
            imagePreview: 'blob:http://localhost:5300/image-uuid',
            selectedImage: { name: 'test-image.png', size: 51200 },
            isUploading: true
        };

        const { container } = render(<InputArea {...props} />);
        const spinner = container.querySelector('.spinner-mini');
        expect(spinner).toBeInTheDocument();
    });

    it('deve chamar handleRemoveImage quando clicar no botão de remover', () => {
        const handleRemoveMock = vi.fn();
        const props = {
            ...mockProps,
            imagePreview: 'blob:http://localhost:5300/image-uuid',
            selectedImage: { name: 'test-image.png', size: 51200 },
            handleRemoveImage: handleRemoveMock
        };

        render(<InputArea {...props} />);

        const removeBtn = screen.getByRole('button', { name: '✕' });
        fireEvent.click(removeBtn);

        expect(handleRemoveMock).toHaveBeenCalledTimes(1);
    });

    it('deve chamar setIsInputExpanded(true) ao clicar no botão de maximizar', () => {
        const setIsExpandedMock = vi.fn();
        const props = {
            ...mockProps,
            setIsInputExpanded: setIsExpandedMock
        };

        render(<InputArea {...props} />);

        const expandBtn = screen.getByTitle('Maximizar editor de texto');
        expect(expandBtn).toBeInTheDocument();
        fireEvent.click(expandBtn);

        expect(setIsExpandedMock).toHaveBeenCalledWith(true);
    });

    it('deve renderizar o modal de editor expandido quando isInputExpanded for true', () => {
        const props = {
            ...mockProps,
            isInputExpanded: true,
            input: 'Texto de teste expandido'
        };

        render(<InputArea {...props} />);

        expect(screen.getByText('Editor Expandido de Mensagem')).toBeInTheDocument();
        expect(screen.getAllByDisplayValue('Texto de teste expandido').length).toBeGreaterThanOrEqual(1);
    });

    it('não deve enviar mensagem ao pressionar Shift+Enter, permitindo quebra de linha', () => {
        const handleSendMessageMock = vi.fn();
        const props = {
            ...mockProps,
            input: 'Linha 1',
            handleSendMessage: handleSendMessageMock
        };

        render(<InputArea {...props} />);

        const textarea = screen.getByPlaceholderText('Mensagem para o agente...');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

        expect(handleSendMessageMock).not.toHaveBeenCalled();
    });
});

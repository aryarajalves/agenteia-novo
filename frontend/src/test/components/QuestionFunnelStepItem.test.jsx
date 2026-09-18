import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuestionFunnelStepItem from '../../components/ConfigPanel/components/QuestionFunnels/QuestionFunnelStepItem';

describe('QuestionFunnelStepItem Component', () => {
    const baseStepText = {
        step_number: 1,
        type: 'text',
        content: 'Olá! Como posso te ajudar hoje?',
        media_url: '',
        transcription: '',
        delay_seconds: 3
    };

    const baseStepAudio = {
        step_number: 1,
        type: 'audio',
        content: '',
        media_url: 'https://exemplo.com/audio.mp3',
        transcription: 'Transcrição do áudio de boas-vindas',
        delay_seconds: 0
    };

    it('renderiza o passo de texto com o botão de maximizar', () => {
        const onMaximize = vi.fn();
        render(
            <QuestionFunnelStepItem
                step={baseStepText}
                idx={0}
                stepsCount={2}
                uploadingIndex={null}
                onUpdateStep={vi.fn()}
                onMoveStep={vi.fn()}
                onRemoveStep={vi.fn()}
                onUploadAudio={vi.fn()}
                onMaximize={onMaximize}
            />
        );

        expect(screen.getByText('Passo #1')).toBeInTheDocument();
        const maxBtn = screen.getByTestId('maximize-step-text-0');
        expect(maxBtn).toBeInTheDocument();

        fireEvent.click(maxBtn);
        expect(onMaximize).toHaveBeenCalledWith(0, 'content', '💬 Mensagem do Passo #1');
    });

    it('renderiza o passo de áudio com o botão de maximizar para transcrição', () => {
        const onMaximize = vi.fn();
        render(
            <QuestionFunnelStepItem
                step={baseStepAudio}
                idx={0}
                stepsCount={1}
                uploadingIndex={null}
                onUpdateStep={vi.fn()}
                onMoveStep={vi.fn()}
                onRemoveStep={vi.fn()}
                onUploadAudio={vi.fn()}
                onMaximize={onMaximize}
            />
        );

        const maxBtn = screen.getByTestId('maximize-step-audio-0');
        expect(maxBtn).toBeInTheDocument();

        fireEvent.click(maxBtn);
        expect(onMaximize).toHaveBeenCalledWith(0, 'transcription', '🎙️ Transcrição do Passo #1');
    });

    it('permite alterar o delay e o tipo do passo', () => {
        const onUpdateStep = vi.fn();
        render(
            <QuestionFunnelStepItem
                step={baseStepText}
                idx={0}
                stepsCount={1}
                uploadingIndex={null}
                onUpdateStep={onUpdateStep}
                onMoveStep={vi.fn()}
                onRemoveStep={vi.fn()}
                onUploadAudio={vi.fn()}
                onMaximize={vi.fn()}
            />
        );

        const delayInput = screen.getByDisplayValue('3');
        fireEvent.change(delayInput, { target: { value: '10' } });
        expect(onUpdateStep).toHaveBeenCalledWith(0, 'delay_seconds', 10);
    });
});

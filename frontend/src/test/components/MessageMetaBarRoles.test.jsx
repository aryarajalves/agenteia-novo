import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageMetaBar from '../../components/ChatPlayground/components/MessageBubbleModules/MessageMetaBar';

describe('MessageMetaBar - Badges de Papel do Modelo (model_role)', () => {
    const baseMsg = {
        role: 'assistant',
        content: 'Resposta de teste',
        metrics: {
            input_tokens: 100,
            output_tokens: 50,
            tokens: 150,
            cost: 0.002,
            response_time_ms: 800
        }
    };

    it('renderiza o badge ⚡ Simples (Router) quando model_role é router_simple', () => {
        const msg = {
            ...baseMsg,
            metrics: { ...baseMsg.metrics, model_role: 'router_simple' }
        };
        render(<MessageMetaBar msg={msg} msgIndex={0} isRegularUser={false} />);
        expect(screen.getByText(/⚡ Simples \(Router\)/)).toBeInTheDocument();
    });

    it('renderiza o badge 🧠 Complexo (Router) quando model_role é router_complex', () => {
        const msg = {
            ...baseMsg,
            metrics: { ...baseMsg.metrics, model_role: 'router_complex' }
        };
        render(<MessageMetaBar msg={msg} msgIndex={0} isRegularUser={false} />);
        expect(screen.getByText(/🧠 Complexo \(Router\)/)).toBeInTheDocument();
    });

    it('renderiza o badge 🟢 Principal quando model_role é main', () => {
        const msg = {
            ...baseMsg,
            metrics: { ...baseMsg.metrics, model_role: 'main' }
        };
        render(<MessageMetaBar msg={msg} msgIndex={0} isRegularUser={false} />);
        expect(screen.getByText(/🟢 Principal/)).toBeInTheDocument();
    });

    it('renderiza o badge 🟡 Fallback quando model_role é fallback', () => {
        const msg = {
            ...baseMsg,
            metrics: { ...baseMsg.metrics, model_role: 'fallback' }
        };
        render(<MessageMetaBar msg={msg} msgIndex={0} isRegularUser={false} />);
        expect(screen.getByText(/🟡 Fallback/)).toBeInTheDocument();
    });

    it('renderiza o badge ⚡ Pré-Router quando model_role é pre-router', () => {
        const msg = {
            ...baseMsg,
            metrics: { ...baseMsg.metrics, model_role: 'pre-router' }
        };
        render(<MessageMetaBar msg={msg} msgIndex={0} isRegularUser={false} />);
        expect(screen.getByText(/⚡ Pré-Router/)).toBeInTheDocument();
    });

    it('renderiza o badge 🔴 Emergência apenas quando model_role é explicitamente emergency', () => {
        const msg = {
            ...baseMsg,
            metrics: { ...baseMsg.metrics, model_role: 'emergency' }
        };
        render(<MessageMetaBar msg={msg} msgIndex={0} isRegularUser={false} />);
        expect(screen.getByText(/🔴 Emergência/)).toBeInTheDocument();
    });
});

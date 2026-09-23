import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { parseList, getSafeEditForm } from '../../components/WebhookManager/components/EditWebhookModal/editWebhookHelpers';
import EditWebhookSidebar from '../../components/WebhookManager/components/EditWebhookModal/EditWebhookSidebar';

describe('EditWebhookModal Modular Helpers & Subcomponents', () => {
    describe('editWebhookHelpers', () => {
        it('parseList deve retornar arrays inalterados', () => {
            const arr = ['item1', 'item2'];
            expect(parseList(arr)).toEqual(arr);
        });

        it('parseList deve parsear strings JSON validas em arrays', () => {
            const jsonStr = '["alfa", "beta"]';
            expect(parseList(jsonStr)).toEqual(['alfa', 'beta']);
        });

        it('parseList deve retornar array vazio para entradas invalidas ou vazias', () => {
            expect(parseList('')).toEqual([]);
            expect(parseList('invalido-nao-json')).toEqual([]);
            expect(parseList(null)).toEqual([]);
            expect(parseList(undefined)).toEqual([]);
            expect(parseList(12345)).toEqual([]);
        });

        it('getSafeEditForm deve preencher defaults seguros e converter campos JSON', () => {
            const safe = getSafeEditForm({
                name: 'Integracao Teste',
                allowed_contacts: '["5511999999999"]',
                blocked_messages: '["bloqueado"]',
                delay_seconds: 45
            });

            expect(safe.name).toBe('Integracao Teste');
            expect(safe.delay_seconds).toBe(45);
            expect(safe.response_delay_seconds).toBe(0);
            expect(safe.split_response_enabled).toBe(true);
            expect(safe.abandonment_delay_value).toBe(24);
            expect(safe.abandonment_delay_unit).toBe('hours');
            expect(safe.allowed_contacts).toEqual(['5511999999999']);
            expect(safe.blocked_messages).toEqual(['bloqueado']);
            expect(Array.isArray(safe.secondary_agent_ids)).toBe(true);
            expect(Array.isArray(safe.delete_keywords)).toBe(true);
            expect(Array.isArray(safe.followup_steps)).toBe(true);
        });
    });

    describe('EditWebhookSidebar', () => {
        it('deve renderizar todas as 5 abas principais', () => {
            render(<EditWebhookSidebar editTab="geral" setEditTab={vi.fn()} />);

            expect(screen.getByRole('button', { name: /Geral/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Agente IA/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Memória/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Segurança/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /ZapVoice/i })).toBeInTheDocument();
        });

        it('deve marcar a aba ativa com a classe active', () => {
            const { rerender } = render(<EditWebhookSidebar editTab="geral" setEditTab={vi.fn()} />);
            expect(screen.getByRole('button', { name: /Geral/i })).toHaveClass('active');
            expect(screen.getByRole('button', { name: /Segurança/i })).not.toHaveClass('active');

            rerender(<EditWebhookSidebar editTab="filtros" setEditTab={vi.fn()} />);
            expect(screen.getByRole('button', { name: /Segurança/i })).toHaveClass('active');
            expect(screen.getByRole('button', { name: /Geral/i })).not.toHaveClass('active');
        });

        it('deve chamar setEditTab com o id correto ao clicar', () => {
            const setEditTab = vi.fn();
            render(<EditWebhookSidebar editTab="geral" setEditTab={setEditTab} />);

            fireEvent.click(screen.getByRole('button', { name: /Agente IA/i }));
            expect(setEditTab).toHaveBeenCalledWith('agente');

            fireEvent.click(screen.getByRole('button', { name: /Memória/i }));
            expect(setEditTab).toHaveBeenCalledWith('memoria');

            fireEvent.click(screen.getByRole('button', { name: /ZapVoice/i }));
            expect(setEditTab).toHaveBeenCalledWith('zapvoice');
        });
    });
});

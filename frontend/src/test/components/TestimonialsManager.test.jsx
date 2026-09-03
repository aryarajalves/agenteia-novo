import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import TestimonialsManager from '../../components/TestimonialsManager';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
    }
}));

describe('TestimonialsManager Component', () => {
    const mockCategories = [
        { id: 1, value: 'curso_ingles', name: 'Curso de Inglês' },
        { id: 2, value: 'mentoria_vip', name: 'Mentoria VIP' }
    ];

    const mockTestimonials = [
        {
            id: 101,
            category: 'curso_ingles',
            media_type: 'image',
            filename: 'depoimento_maria.jpg',
            caption: 'Adorei as aulas!',
            order_position: 1,
            media_url: 'http://localhost:9008/depoimento_maria.jpg'
        },
        {
            id: 102,
            category: 'curso_ingles',
            media_type: 'video',
            filename: 'depoimento_joao.mp4',
            caption: 'Resultado em 3 meses',
            order_position: 1,
            media_url: 'http://localhost:9008/depoimento_joao.mp4'
        },
        {
            id: 103,
            category: 'mentoria_vip',
            media_type: 'image',
            filename: 'depoimento_ana.png',
            caption: 'Mentoria transformadora',
            order_position: 1,
            media_url: 'http://localhost:9008/depoimento_ana.png'
        }
    ];

    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url.includes('/testimonials/categories')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockCategories)
                });
            }
            if (url.includes('/testimonials')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTestimonials)
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('deve carregar e renderizar o cabeçalho, filtros e os depoimentos', async () => {
        render(<TestimonialsManager />);

        await waitFor(() => {
            expect(screen.getByText('Gerenciador de Depoimentos')).toBeInTheDocument();
        });

        expect(screen.getByText('📁 Gerenciar Categorias')).toBeInTheDocument();
        expect(screen.getByText('➕ Enviar Novo Depoimento')).toBeInTheDocument();

        // Cards de depoimentos
        expect(screen.getByText('depoimento_maria.jpg')).toBeInTheDocument();
        expect(screen.getByText('depoimento_joao.mp4')).toBeInTheDocument();
        expect(screen.getByText('depoimento_ana.png')).toBeInTheDocument();
    });

    it('deve filtrar os depoimentos por tipo de mídia', async () => {
        render(<TestimonialsManager />);

        await waitFor(() => {
            expect(screen.getByText('depoimento_maria.jpg')).toBeInTheDocument();
        });

        const mediaTypeSelect = screen.getByDisplayValue('🎬 Todas as Mídias');
        fireEvent.change(mediaTypeSelect, { target: { value: 'video' } });

        // Apenas o vídeo deve estar visível
        expect(screen.getByText('depoimento_joao.mp4')).toBeInTheDocument();
        expect(screen.queryByText('depoimento_maria.jpg')).not.toBeInTheDocument();
        expect(screen.queryByText('depoimento_ana.png')).not.toBeInTheDocument();
    });

    it('deve exibir mensagem de estado vazio quando nenhum depoimento corresponder ao filtro', async () => {
        render(<TestimonialsManager />);

        await waitFor(() => {
            expect(screen.getByText('depoimento_maria.jpg')).toBeInTheDocument();
        });

        // Filtrar por categoria sem vídeos (mentoria_vip só tem imagem)
        const categorySelect = screen.getByDisplayValue('📁 Todos os Cursos');
        fireEvent.change(categorySelect, { target: { value: 'mentoria_vip' } });

        const mediaTypeSelect = screen.getByDisplayValue('🎬 Todas as Mídias');
        fireEvent.change(mediaTypeSelect, { target: { value: 'video' } });

        expect(screen.getByText('Nenhum depoimento encontrado')).toBeInTheDocument();
    });

    it('deve abrir o modal de gerenciar categorias ao clicar no botão', async () => {
        render(<TestimonialsManager />);

        await waitFor(() => {
            expect(screen.getByText('📁 Gerenciar Categorias')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('📁 Gerenciar Categorias'));

        expect(screen.getByPlaceholderText('Nova Categoria...')).toBeInTheDocument();
    });

    it('deve abrir o modal de upload ao clicar no botão de novo depoimento', async () => {
        render(<TestimonialsManager />);

        await waitFor(() => {
            expect(screen.getByText('➕ Enviar Novo Depoimento')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('➕ Enviar Novo Depoimento'));

        expect(screen.getByText('📤 Enviar Depoimento')).toBeInTheDocument();
        expect(screen.getByText('Escolha o Curso/Categoria:')).toBeInTheDocument();
    });
});

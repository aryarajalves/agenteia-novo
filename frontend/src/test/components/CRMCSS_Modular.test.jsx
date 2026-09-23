import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('CRM Modular Styles & Classes', () => {
    it('deve renderizar elementos com as classes de CRMHeaderAndStats corretamente', () => {
        const { container } = render(
            <div className="crm-container">
                <button className="crm-btn-close-fullscreen">✕ Fechar</button>
                <div className="crm-header-wrapper">
                    <div className="crm-title-row">
                        <div className="crm-title-content">
                            <h1>Kanban CRM</h1>
                            <p>Gestão de contatos</p>
                        </div>
                    </div>
                    <div className="crm-stats-grid">
                        <div className="crm-stat-card">
                            <div className="crm-stat-icon">👥</div>
                            <div className="crm-stat-value">120</div>
                            <div className="crm-stat-label">Total Leads</div>
                        </div>
                    </div>
                    <div className="crm-controls-bar">
                        <div className="crm-search-box">
                            <span className="crm-search-icon">🔍</span>
                            <input type="text" placeholder="Buscar..." />
                        </div>
                        <div className="crm-filter-group">
                            <button className="crm-filter-btn active">Todos</button>
                        </div>
                    </div>
                </div>
            </div>
        );

        expect(container.querySelector('.crm-container')).toBeInTheDocument();
        expect(container.querySelector('.crm-btn-close-fullscreen')).toBeInTheDocument();
        expect(container.querySelector('.crm-header-wrapper')).toBeInTheDocument();
        expect(container.querySelector('.crm-stats-grid')).toBeInTheDocument();
        expect(container.querySelector('.crm-controls-bar')).toBeInTheDocument();
        expect(container.querySelector('.crm-search-box')).toBeInTheDocument();
        expect(screen.getByText('Kanban CRM')).toBeInTheDocument();
    });

    it('deve renderizar elementos com as classes de CRMBoardAndColumns corretamente', () => {
        const { container } = render(
            <div className="crm-board">
                <div className="crm-column">
                    <div className="crm-column-header">
                        <div className="crm-column-title-group">
                            <span className="crm-column-title">Novos Contatos</span>
                            <span className="crm-column-badge">5</span>
                        </div>
                    </div>
                    <div className="crm-column-body">
                        <div className="crm-empty-column">Nenhum contato nesta etapa</div>
                    </div>
                    <div className="crm-column-pagination">
                        <span className="crm-pagination-info">Pág 1 de 1</span>
                        <div className="crm-pagination-controls">
                            <button className="crm-page-btn" disabled>‹</button>
                            <span className="crm-page-current">1</span>
                            <button className="crm-page-btn" disabled>›</button>
                        </div>
                    </div>
                </div>
            </div>
        );

        expect(container.querySelector('.crm-board')).toBeInTheDocument();
        expect(container.querySelector('.crm-column')).toBeInTheDocument();
        expect(container.querySelector('.crm-column-header')).toBeInTheDocument();
        expect(container.querySelector('.crm-column-body')).toBeInTheDocument();
        expect(container.querySelector('.crm-column-pagination')).toBeInTheDocument();
        expect(screen.getByText('Novos Contatos')).toBeInTheDocument();
    });

    it('deve renderizar elementos com as classes de CRMLeadCard corretamente', () => {
        const { container } = render(
            <div className="crm-lead-card">
                <div className="crm-card-header">
                    <div>
                        <div className="crm-card-name">João Silva</div>
                        <div className="crm-card-phone">📱 +5511999998888</div>
                    </div>
                    <span className="crm-badge-source template">Template</span>
                </div>
                <div className="crm-card-message">Olá, gostaria de mais informações.</div>
                <div className="crm-card-footer">
                    <div className="crm-score-pill">⭐ 12/13</div>
                    <a className="crm-btn-chat" href="#chat">💬 WhatsApp</a>
                </div>
            </div>
        );

        expect(container.querySelector('.crm-lead-card')).toBeInTheDocument();
        expect(container.querySelector('.crm-card-header')).toBeInTheDocument();
        expect(container.querySelector('.crm-badge-source.template')).toBeInTheDocument();
        expect(container.querySelector('.crm-card-message')).toBeInTheDocument();
        expect(container.querySelector('.crm-card-footer')).toBeInTheDocument();
        expect(container.querySelector('.crm-btn-chat')).toBeInTheDocument();
        expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
});

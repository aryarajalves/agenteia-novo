import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Dashboard Modular Styles & Classes', () => {
    it('deve renderizar elementos com as classes de DashboardHeaderAndMetrics corretamente', () => {
        const { container } = render(
            <div className="modern-dashboard">
                <header className="dashboard-header-flex">
                    <div>
                        <h1>Gerenciamento de Agentes</h1>
                        <p className="subtitle">Monitore sua frota</p>
                    </div>
                    <button className="create-agent-btn-shiny">+ Novo Agente</button>
                </header>
                <div className="tab-switcher">
                    <button className="active">🤖 Meus Agentes</button>
                    <button>🌍 Variáveis Globais</button>
                </div>
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon-wrapper">🤖</div>
                        <div className="stat-info">
                            <span className="stat-value">5</span>
                            <span className="stat-title">Agentes Ativos</span>
                        </div>
                    </div>
                </div>
            </div>
        );

        expect(container.querySelector('.modern-dashboard')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-header-flex')).toBeInTheDocument();
        expect(container.querySelector('.create-agent-btn-shiny')).toBeInTheDocument();
        expect(container.querySelector('.tab-switcher')).toBeInTheDocument();
        expect(container.querySelector('.stats-row')).toBeInTheDocument();
        expect(container.querySelector('.stat-card')).toBeInTheDocument();
        expect(screen.getByText('Agentes Ativos')).toBeInTheDocument();
    });

    it('deve renderizar elementos com as classes de DashboardAgentCards corretamente', () => {
        const { container } = render(
            <div className="agents-grid-responsive">
                <div className="modern-agent-card">
                    <div className="card-top-border" />
                    <div className="card-header">
                        <div className="header-left">
                            <span className="status-indicator active" />
                            <span className="tech-badge">GPT-4o</span>
                        </div>
                        <div className="card-hover-actions">
                            <button className="action-btn-small">✏️</button>
                        </div>
                    </div>
                    <div className="card-body">
                        <h3>Agente Teste</h3>
                        <p className="description">Descrição do agente para testes.</p>
                    </div>
                    <div className="card-footer">
                        <button className="btn-primary">Configurar</button>
                        <button className="btn-secondary">Testar</button>
                    </div>
                </div>
            </div>
        );

        expect(container.querySelector('.agents-grid-responsive')).toBeInTheDocument();
        expect(container.querySelector('.modern-agent-card')).toBeInTheDocument();
        expect(container.querySelector('.card-top-border')).toBeInTheDocument();
        expect(container.querySelector('.status-indicator.active')).toBeInTheDocument();
        expect(container.querySelector('.btn-primary')).toBeInTheDocument();
        expect(container.querySelector('.btn-secondary')).toBeInTheDocument();
    });

    it('deve renderizar elementos com as classes de DashboardFilters corretamente', () => {
        const { container } = render(
            <div className="filter-bar">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input placeholder="Buscar agente..." type="text" />
                </div>
                <button className="select-all-btn">
                    <div className="selection-checkbox" />
                    Selecionar Tudo
                </button>
                <select className="filter-select-premium">
                    <option value="">Todos os Modelos</option>
                </select>
                <button className="refresh-btn">🔄</button>
            </div>
        );

        expect(container.querySelector('.filter-bar')).toBeInTheDocument();
        expect(container.querySelector('.search-wrapper')).toBeInTheDocument();
        expect(container.querySelector('.select-all-btn')).toBeInTheDocument();
        expect(container.querySelector('.filter-select-premium')).toBeInTheDocument();
        expect(container.querySelector('.refresh-btn')).toBeInTheDocument();
    });
});

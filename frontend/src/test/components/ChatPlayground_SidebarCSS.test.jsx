import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ChatPlayground Sidebar CSS Modularization', () => {
  const stylesDir = path.resolve(__dirname, '../../components/ChatPlayground/styles');
  const modulesDir = path.join(stylesDir, 'modules');

  it('deve existir o arquivo Sidebar.css agregador com os imports dos submodulos', () => {
    const mainCssPath = path.join(stylesDir, 'Sidebar.css');
    expect(fs.existsSync(mainCssPath)).toBe(true);

    const content = fs.readFileSync(mainCssPath, 'utf8');
    expect(content).toMatch(/@import\s+['"].\/modules\/SidebarBase\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/modules\/SidebarContext\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/modules\/SidebarStats\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/modules\/SidebarHistory\.css['"];/);

    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(50);
  });

  it('deve conter todos os submodulos modulares em styles/modules/ e cada um ter menos de 500 linhas', () => {
    const expectedModules = [
      'SidebarBase.css',
      'SidebarContext.css',
      'SidebarStats.css',
      'SidebarHistory.css',
    ];

    for (const mod of expectedModules) {
      const filePath = path.join(modulesDir, mod);
      expect(fs.existsSync(filePath), `Modulo ${mod} deve existir`).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      expect(lines, `Modulo ${mod} nao deve exceder 500 linhas`).toBeLessThan(500);
      expect(content.length).toBeGreaterThan(50);
    }
  });

  it('deve conter as classes criticas distribuidas nos modulos corretos', () => {
    const baseContent = fs.readFileSync(path.join(modulesDir, 'SidebarBase.css'), 'utf8');
    expect(baseContent).toContain('.playground-sidebar');
    expect(baseContent).toContain('.sidebar-tabs');

    const contextContent = fs.readFileSync(path.join(modulesDir, 'SidebarContext.css'), 'utf8');
    expect(contextContent).toContain('.context-card');
    expect(contextContent).toContain('.guide-trigger-btn');

    const statsContent = fs.readFileSync(path.join(modulesDir, 'SidebarStats.css'), 'utf8');
    expect(statsContent).toContain('.modern-stat-card');
    expect(statsContent).toContain('.sentiment-meter');

    const historyContent = fs.readFileSync(path.join(modulesDir, 'SidebarHistory.css'), 'utf8');
    expect(historyContent).toContain('.history-list');
    expect(historyContent).toContain('.history-item');
    expect(historyContent).toContain('.selection-toolbar');
  });
});

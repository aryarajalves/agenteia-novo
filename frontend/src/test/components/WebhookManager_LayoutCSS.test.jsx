import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('WebhookManager Layout CSS Modularization', () => {
  const stylesDir = path.resolve(__dirname, '../../components/WebhookManager/styles/Modules');
  const modulesDir = path.join(stylesDir, 'Layout');

  it('deve existir o arquivo agregador Layout.css com os imports dos submodulos', () => {
    const mainCssPath = path.join(stylesDir, 'Layout.css');
    expect(fs.existsSync(mainCssPath)).toBe(true);

    const content = fs.readFileSync(mainCssPath, 'utf8');
    expect(content).toMatch(/@import\s+['"].\/Layout\/LayoutBaseAndHeader\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/Layout\/WebhookCard\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/Layout\/BulkToolbarAndFeedback\.css['"];/);

    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(50);
  });

  it('deve conter todos os submodulos modulares em Modules/Layout/ e cada um ter menos de 500 linhas', () => {
    const expectedModules = [
      'LayoutBaseAndHeader.css',
      'WebhookCard.css',
      'BulkToolbarAndFeedback.css',
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
    const baseContent = fs.readFileSync(path.join(modulesDir, 'LayoutBaseAndHeader.css'), 'utf8');
    expect(baseContent).toContain(':root');
    expect(baseContent).toContain('.webhook-manager-container');
    expect(baseContent).toContain('.webhook-manager-header');
    expect(baseContent).toContain('.btn-new-webhook');

    const cardContent = fs.readFileSync(path.join(modulesDir, 'WebhookCard.css'), 'utf8');
    expect(cardContent).toContain('.webhook-card-modern');
    expect(cardContent).toContain('.selection-checkbox');
    expect(cardContent).toContain('.card-header');
    expect(cardContent).toContain('.toggle-switch');
    expect(cardContent).toContain('.url-display-premium');
    expect(cardContent).toContain('.card-footer-modern');
    expect(cardContent).toContain('.actions-group');

    const bulkContent = fs.readFileSync(path.join(modulesDir, 'BulkToolbarAndFeedback.css'), 'utf8');
    expect(bulkContent).toContain('.bulk-toolbar-premium');
    expect(bulkContent).toContain('.btn-bulk-delete');
    expect(bulkContent).toContain('.lead-card-premium');
    expect(bulkContent).toContain('.toast-premium');
  });
});

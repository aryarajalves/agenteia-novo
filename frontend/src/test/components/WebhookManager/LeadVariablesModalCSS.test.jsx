import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('LeadVariablesModal CSS Modularization', () => {
  const stylesDir = path.resolve(__dirname, '../../../components/WebhookManager/styles');
  const modulesDir = path.join(stylesDir, 'LeadVariablesModal');

  it('deve existir o arquivo agregador LeadVariablesModal.css com os imports dos submodulos', () => {
    const mainCssPath = path.join(stylesDir, 'LeadVariablesModal.css');
    expect(fs.existsSync(mainCssPath)).toBe(true);

    const content = fs.readFileSync(mainCssPath, 'utf8');
    expect(content).toMatch(/@import\s+['"].\/LeadVariablesModal\/LeadVariablesBaseAndHeader\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/LeadVariablesModal\/LeadVariablesFiltersAndBody\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/LeadVariablesModal\/LeadVariablesCardAndBadges\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/LeadVariablesModal\/LeadVariablesValuesAndFooter\.css['"];/);

    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(50);
  });

  it('deve conter todos os submodulos modulares em styles/LeadVariablesModal/ e cada um ter menos de 500 linhas', () => {
    const expectedModules = [
      'LeadVariablesBaseAndHeader.css',
      'LeadVariablesFiltersAndBody.css',
      'LeadVariablesCardAndBadges.css',
      'LeadVariablesValuesAndFooter.css',
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
    const baseContent = fs.readFileSync(path.join(modulesDir, 'LeadVariablesBaseAndHeader.css'), 'utf8');
    expect(baseContent).toContain('.lead-vars-overlay');
    expect(baseContent).toContain('.lead-vars-modal');
    expect(baseContent).toContain('.lead-vars-header');
    expect(baseContent).toContain('.btn-lead-vars-close');

    const filterContent = fs.readFileSync(path.join(modulesDir, 'LeadVariablesFiltersAndBody.css'), 'utf8');
    expect(filterContent).toContain('.lead-vars-filters-bar');
    expect(filterContent).toContain('.lead-vars-search-box');
    expect(filterContent).toContain('.lead-vars-tabs');
    expect(filterContent).toContain('.lead-vars-tab');
    expect(filterContent).toContain('.lead-vars-loading');

    const cardContent = fs.readFileSync(path.join(modulesDir, 'LeadVariablesCardAndBadges.css'), 'utf8');
    expect(cardContent).toContain('.lead-vars-grid');
    expect(cardContent).toContain('.lead-var-card');
    expect(cardContent).toContain('.lead-var-key');
    expect(cardContent).toContain('.lead-var-origin-badge');
    expect(cardContent).toContain('.lead-var-origin-banner');

    const valueContent = fs.readFileSync(path.join(modulesDir, 'LeadVariablesValuesAndFooter.css'), 'utf8');
    expect(valueContent).toContain('.lead-var-value-box');
    expect(valueContent).toContain('.lead-var-value-text');
    expect(valueContent).toContain('.lead-vars-footer');
    expect(valueContent).toContain('.btn-lead-vars-done');
  });
});

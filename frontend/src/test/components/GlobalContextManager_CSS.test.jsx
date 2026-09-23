import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GlobalContextManager.css Modular Styles', () => {
    const basePath = path.resolve(__dirname, '../../components/GlobalContextManager/styles');
    const mainCssPath = path.join(basePath, 'GlobalContextManager.css');
    const modulesDir = path.join(basePath, 'modules');

    it('deve existir o arquivo agregador GlobalContextManager.css e importar os submódulos', () => {
        expect(fs.existsSync(mainCssPath)).toBe(true);
        const content = fs.readFileSync(mainCssPath, 'utf8');

        expect(content).toContain("GlobalContextCard.css");
        expect(content).toContain("AddVariableModal.css");
        expect(content).toContain("ExpandedFieldModal.css");

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(30);
    });

    it('deve conter o submódulo GlobalContextCard.css com seletores de cards e listas', () => {
        const cardCss = path.join(modulesDir, 'GlobalContextCard.css');
        expect(fs.existsSync(cardCss)).toBe(true);
        const content = fs.readFileSync(cardCss, 'utf8');

        expect(content).toContain('.global-context-card');
        expect(content).toContain('.card-header-main');
        expect(content).toContain('.add-var-btn');
        expect(content).toContain('.vars-list');
        expect(content).toContain('.var-item');
        expect(content).toContain('.var-key');
        expect(content).toContain('.var-input');

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(500);
        expect(lines).toBeLessThan(370);
    });

    it('deve conter o submódulo AddVariableModal.css com seletores do modal de variáveis', () => {
        const modalCss = path.join(modulesDir, 'AddVariableModal.css');
        expect(fs.existsSync(modalCss)).toBe(true);
        const content = fs.readFileSync(modalCss, 'utf8');

        expect(content).toContain('.add-var-overlay');
        expect(content).toContain('.add-var-modal');
        expect(content).toContain('.modal-header-accent');
        expect(content).toContain('.form-group-glow');
        expect(content).toContain('.modal-footer-grid');
        expect(content).toContain('.btn-modal-primary');

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(500);
        expect(lines).toBeLessThan(370);
    });

    it('deve conter o submódulo ExpandedFieldModal.css com seletores do modal expandido', () => {
        const expandedCss = path.join(basePath, 'ExpandedFieldModal.css');
        expect(fs.existsSync(expandedCss)).toBe(true);
        const content = fs.readFileSync(expandedCss, 'utf8');

        expect(content).toContain('.btn-maximize-field');
        expect(content).toContain('.expanded-field-overlay');
        expect(content).toContain('.expanded-field-modal');
        expect(content).toContain('.expanded-field-textarea');
        expect(content).toContain('.btn-expanded-save');

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(500);
        expect(lines).toBeLessThan(370);
    });
});

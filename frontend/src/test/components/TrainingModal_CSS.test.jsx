import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TrainingModal.css Modular Styles', () => {
    const basePath = path.resolve(__dirname, '../../components/TranscriptionHistory/styles');
    const mainCssPath = path.join(basePath, 'TrainingModal.css');
    const modulesDir = path.join(basePath, 'modules');

    it('deve existir o arquivo agregador TrainingModal.css e importar os submódulos', () => {
        expect(fs.existsSync(mainCssPath)).toBe(true);
        const content = fs.readFileSync(mainCssPath, 'utf8');

        expect(content).toContain("TrainingModalBase.css");
        expect(content).toContain("TrainingModalSetup.css");
        expect(content).toContain("TrainingModalCards.css");

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(30);
    });

    it('deve conter o submódulo TrainingModalBase.css com seletores de base, header e footer', () => {
        const baseCss = path.join(modulesDir, 'TrainingModalBase.css');
        expect(fs.existsSync(baseCss)).toBe(true);
        const content = fs.readFileSync(baseCss, 'utf8');

        expect(content).toContain('.training-modal-overlay');
        expect(content).toContain('.training-modal-content');
        expect(content).toContain('.training-modal-header');
        expect(content).toContain('.training-modal-close');
        expect(content).toContain('.training-modal-body');
        expect(content).toContain('.training-modal-footer');
        expect(content).toContain('.training-btn-save');

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(500);
        expect(lines).toBeLessThan(370);
    });

    it('deve conter o submódulo TrainingModalSetup.css com seletores de setup de geração', () => {
        const setupCss = path.join(modulesDir, 'TrainingModalSetup.css');
        expect(fs.existsSync(setupCss)).toBe(true);
        const content = fs.readFileSync(setupCss, 'utf8');

        expect(content).toContain('.training-setup-wrapper');
        expect(content).toContain('.training-info-block');
        expect(content).toContain('.training-form-group');
        expect(content).toContain('.training-select');
        expect(content).toContain('.training-btn-generate');

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(500);
        expect(lines).toBeLessThan(370);
    });

    it('deve conter o submódulo TrainingModalCards.css com seletores de edição e cards', () => {
        const cardsCss = path.join(modulesDir, 'TrainingModalCards.css');
        expect(fs.existsSync(cardsCss)).toBe(true);
        const content = fs.readFileSync(cardsCss, 'utf8');

        expect(content).toContain('.training-edit-wrapper');
        expect(content).toContain('.training-cards-list');
        expect(content).toContain('.training-card-item');
        expect(content).toContain('.training-card-remove');
        expect(content).toContain('.training-card-input');
        expect(content).toContain('.training-card-textarea');

        const lines = content.split('\n').length;
        expect(lines).toBeLessThan(500);
        expect(lines).toBeLessThan(370);
    });
});

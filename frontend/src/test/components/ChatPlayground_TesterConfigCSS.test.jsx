import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TesterConfig.css Modular Styles', () => {
    const basePath = path.resolve(__dirname, '../../components/ChatPlayground/styles/modules');
    const mainCssPath = path.join(basePath, 'TesterConfig.css');
    const submodulesDir = path.join(basePath, 'TesterConfig');

    it('deve existir o arquivo de entrada TesterConfig.css e conter as diretivas @import modulares', () => {
        expect(fs.existsSync(mainCssPath)).toBe(true);
        const content = fs.readFileSync(mainCssPath, 'utf8');

        expect(content).toContain("@import './TesterConfig/TesterConfigBase.css';");
        expect(content).toContain("@import './TesterConfig/TesterConfigActions.css';");
        expect(content).toContain("@import './TesterConfig/TesterConfigCustomQuestions.css';");
        expect(content).toContain("@import './TesterConfig/TesterConfigToggleSwitch.css';");

        // Arquivo de entrada deve ter menos de 30 linhas
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(30);
    });

    it('deve conter todos os submódulos CSS criados com seletores válidos e menos de 500 linhas', () => {
        const expectedModules = [
            { file: 'TesterConfigBase.css', expectedSelector: '.tester-config-box' },
            { file: 'TesterConfigActions.css', expectedSelector: '.start-tester-btn-modern' },
            { file: 'TesterConfigCustomQuestions.css', expectedSelector: '.custom-questions-box' },
            { file: 'TesterConfigToggleSwitch.css', expectedSelector: '.toggle-switch' }
        ];

        expectedModules.forEach(({ file, expectedSelector }) => {
            const filePath = path.join(submodulesDir, file);
            expect(fs.existsSync(filePath), `Submódulo ${file} deve existir`).toBe(true);

            const content = fs.readFileSync(filePath, 'utf8');
            expect(content).toContain(expectedSelector);

            const lineCount = content.split('\n').length;
            expect(lineCount).toBeLessThan(500);
            expect(lineCount).toBeLessThan(370); // Bem abaixo do sinal vermelho
        });
    });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PlaygroundLayoutAndHeader.css Modular Styles', () => {
    const basePath = path.resolve(__dirname, '../../components/ChatPlayground/styles/modules');
    const mainCssPath = path.join(basePath, 'PlaygroundLayoutAndHeader.css');
    const submodulesDir = path.join(basePath, 'PlaygroundLayoutAndHeader');

    it('deve existir o arquivo de entrada PlaygroundLayoutAndHeader.css e conter as diretivas @import modulares', () => {
        expect(fs.existsSync(mainCssPath)).toBe(true);
        const content = fs.readFileSync(mainCssPath, 'utf8');

        expect(content).toContain("PlaygroundMainLayout.css");
        expect(content).toContain("PlaygroundHeaderAndActions.css");

        // Arquivo agregador deve ter bem menos de 30 linhas
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(30);
    });

    it('deve conter PlaygroundMainLayout.css com os seletores estruturais de layout e menos de 370 linhas', () => {
        const layoutFile = path.join(submodulesDir, 'PlaygroundMainLayout.css');
        expect(fs.existsSync(layoutFile), 'PlaygroundMainLayout.css deve existir').toBe(true);

        const content = fs.readFileSync(layoutFile, 'utf8');
        expect(content).toContain('.playground-container');
        expect(content).toContain('.playground-sidebar');
        expect(content).toContain('.chat-area-wrapper');
        expect(content).toContain('.chat-area');
        expect(content).toContain('.chat-column');
        expect(content).toContain('.messages-container');
        expect(content).toContain('.column-header');
        expect(content).toContain('.model-tag');

        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(500);
        expect(lineCount).toBeLessThan(370);
    });

    it('deve conter PlaygroundHeaderAndActions.css com os seletores de cabeçalho e ações e menos de 370 linhas', () => {
        const headerFile = path.join(submodulesDir, 'PlaygroundHeaderAndActions.css');
        expect(fs.existsSync(headerFile), 'PlaygroundHeaderAndActions.css deve existir').toBe(true);

        const content = fs.readFileSync(headerFile, 'utf8');
        expect(content).toContain('.chat-premium-header');
        expect(content).toContain('.agent-brand');
        expect(content).toContain('.avatar-mini');
        expect(content).toContain('.agent-meta-title');
        expect(content).toContain('.session-tools-bar');
        expect(content).toContain('.tool-btn');
        expect(content).toContain('.toggle-sidebar-btn');
        expect(content).toContain('.header-actions-row');
        expect(content).toContain('.edit-prompt-link');
        expect(content).toContain('.reset-chat-btn');
        expect(content).toContain('.export-training-btn');
        expect(content).toContain('.hotfix-toggle');

        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(500);
        expect(lineCount).toBeLessThan(370);
    });
});

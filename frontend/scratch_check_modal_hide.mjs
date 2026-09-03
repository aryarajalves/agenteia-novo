import { chromium } from 'playwright';
import path from 'path';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        console.log('1. Acessando login...');
        await page.goto('http://localhost:5300/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        const passInput = page.locator('input[type="password"]').first();

        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com');
        await passInput.fill('');
        await passInput.type('123456');

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        console.log('2. Logado com sucesso.');

        console.log('3. Navegando para tela de edição de agente (/agent/new)...');
        await page.goto('http://localhost:5300/agent/new', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const fabBefore = await page.locator('.advisor-fab').isVisible();
        console.log('Bolinha do assistente visível antes de abrir modal:', fabBefore);

        console.log('4. Clicando no botão de configurações na sidebar...');
        const settingsBtn = page.locator('.settings-sidebar-btn');
        await settingsBtn.click();
        await page.waitForTimeout(1000);

        const modalOpen = await page.locator('.modal-overlay').isVisible();
        console.log('Modal de configurações aberto:', modalOpen);

        const fabAfter = await page.locator('.advisor-fab').isVisible();
        console.log('Bolinha do assistente visível após abrir modal (deve ser false):', fabAfter);

        const screenshotPath = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/f647d26d-8299-43ea-bfab-0dab0b96d9fe/settings_modal_no_bubble.png');
        await page.screenshot({ path: screenshotPath });
        console.log('✅ Screenshot salvo em:', screenshotPath);

        if (fabAfter) {
            console.error('❌ ERRO: A bolinha do assistente ainda está visível com o modal aberto!');
            process.exit(1);
        } else {
            console.log('✅ SUCESSO: A bolinha do assistente foi devidamente ocultada!');
        }
    } catch (err) {
        console.error('Erro na execução do teste visual:', err);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

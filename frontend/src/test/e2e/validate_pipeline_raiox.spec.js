import { test, expect } from '@playwright/test';

test('Validação Visual do Pipeline e Raio-X', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Acesso à interface local
    await page.goto('http://localhost:5300/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Login limpando os campos
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.fill('aryarajmarketing@gmail.com');

        await passInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passInput.fill('123456');

        await submitBtn.click();
        await page.waitForTimeout(3000);
    }

    // 3. Ir para Webhooks
    const webhooksNav = page.locator('a[href*="webhooks"], button:has-text("Webhooks")').first();
    if (await webhooksNav.isVisible({ timeout: 3000 }).catch(() => false)) {
        await webhooksNav.click();
        await page.waitForTimeout(2000);
    } else {
        await page.goto('http://localhost:5300/webhooks', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
    }

    // 4. Abrir Contatos
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    if (await contatosBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await contatosBtn.click();
        await page.waitForTimeout(2000);
    }

    // 5. Abrir Histórico
    const historyLeadBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
    if (await historyLeadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await historyLeadBtn.click();
        await page.waitForTimeout(2000);
    } else {
        const leadCard = page.locator('.lead-card-premium').first();
        if (await leadCard.isVisible()) {
            await leadCard.click();
            await page.waitForTimeout(1000);
            const expandBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
            if (await expandBtn.isVisible()) {
                await expandBtn.click();
                await page.waitForTimeout(2000);
            }
        }
    }

    // 6. Abrir Pipeline do evento
    const pipelineBtn = page.locator('button:has-text("Pipeline"), button[title*="Pipeline"], button:has-text("Ver Pipeline")').first();
    if (await pipelineBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pipelineBtn.click();
        await page.waitForTimeout(2000);
    }

    // 7. Captura de tela do modal do Pipeline
    await page.screenshot({ path: 'pipeline_validated_view.png', fullPage: false });
});

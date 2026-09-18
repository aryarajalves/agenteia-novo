import { test, expect } from '@playwright/test';

test('Validação E2E do Botão Maximizar e Popup Centralizado da Ação Final', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Acessar tela principal
    await page.goto('http://localhost:5300/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Login se necessário
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
        await page.waitForTimeout(3500);
    }

    if (!page.url().includes('/agents')) {
        await page.goto('http://localhost:5300/agents', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
    }

    // 3. Abrir configurações do agente Tarcira ou primeiro agente
    const configBtn = page.locator('button:has-text("Configurar"), button[title*="Configurar"]').first();
    await expect(configBtn).toBeVisible({ timeout: 15000 });
    await configBtn.click();
    await page.waitForTimeout(2000);

    // 4. Clicar na aba "🎯 Funil de Qualificação"
    const funilTab = page.locator('button:has-text("Funil de Qualificação")').first();
    await expect(funilTab).toBeVisible({ timeout: 10000 });
    await funilTab.click();
    await page.waitForTimeout(1500);

    // 5. Clicar na sub-aba "🚀 Ação Final / Fechamento"
    const finalActionTab = page.locator('button:has-text("Ação Final"), button:has-text("Fechamento")').first();
    await expect(finalActionTab).toBeVisible({ timeout: 10000 });
    await finalActionTab.click();
    await page.waitForTimeout(1500);

    // 6. Validar presença do botão "⛶ Maximizar Campo" acima do textarea
    const maxBtn = page.locator('[data-testid="maximize-qualification-final-action-btn"]').first();
    await expect(maxBtn).toBeVisible({ timeout: 10000 });
    await maxBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Captura screenshot com o novo botão visível acima do textarea
    await page.screenshot({
        path: 'final_action_maximize_button_view.png'
    });

    // 7. Clicar no botão "⛶ Maximizar Campo"
    await maxBtn.click();
    await page.waitForTimeout(1500);

    // 8. Validar que o modal grande e centralizado abriu
    const modal = page.locator('[data-testid="expanded-field-modal"]').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Captura screenshot do modal amplo centralizado
    await page.screenshot({
        path: 'final_action_expanded_modal_view.png'
    });
});

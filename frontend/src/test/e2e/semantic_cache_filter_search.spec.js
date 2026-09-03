import { test, expect } from '@playwright/test';

test('Validação E2E do Filtro de Busca de Perguntas e Respostas Existentes no Cache', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Acesso ao sistema
    await page.goto('http://localhost:5300/playground?agentId=36');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill('');
        await emailInput.fill('aryarajmarketing@gmail.com');
        await passInput.fill('');
        await passInput.fill('123456');
        await submitBtn.click();
        await page.waitForTimeout(3000);
    }

    if (!page.url().includes('/playground')) {
        await page.goto('http://localhost:5300/playground?agentId=36');
        await page.waitForTimeout(2000);
    }

    // 2. Enviar pergunta inédita
    const chatInput = page.locator('textarea, input[placeholder*="Mensagem"]').first();
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    const uniqueQuestion = `qual a garantia do curso ${Date.now()}?`;
    await chatInput.fill(uniqueQuestion);

    const sendBtn = page.locator('button[aria-label="Enviar mensagem"], button:has-text("🚀")').first();
    if (await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    // 3. Aguardar resposta e clicar no 👍
    const thumbsUpBtn = page.locator('button.thumbs-up').first();
    await expect(thumbsUpBtn).toBeVisible({ timeout: 45000 });
    await thumbsUpBtn.click();
    await page.waitForTimeout(1000);

    // 4. Alternar para a aba "🔗 Vincular a Resposta Existente"
    const linkTabBtn = page.locator('[data-testid="tab-mode-link-btn"]');
    await expect(linkTabBtn).toBeVisible({ timeout: 5000 });
    await linkTabBtn.click();
    await page.waitForTimeout(800);

    // 5. Utilizar o campo de filtro de busca
    const filterInput = page.locator('[data-testid="filter-existing-cache-input"]');
    await expect(filterInput).toBeVisible({ timeout: 5000 });
    await filterInput.fill('reembolso');
    await page.waitForTimeout(600);

    // Screenshot do Modal com o Filtro Aplicado em Tempo Real
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_filter_existing_cache_modal.png'
    });

    // 6. Confirmar vinculação
    const linkConfirmBtn = page.locator('[data-testid="confirm-link-cache-btn"]');
    await expect(linkConfirmBtn).toBeEnabled();
    await linkConfirmBtn.click();
    await page.waitForTimeout(2000);

    // 7. Screenshot do resultado de sucesso
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_filter_link_success.png'
    });
});

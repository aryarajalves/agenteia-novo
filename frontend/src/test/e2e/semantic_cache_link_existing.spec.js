import { test, expect } from '@playwright/test';

test('Validação E2E de Vincular Pergunta a uma Resposta Já Existente no Cache', async ({ page }) => {
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

    // 2. Garantir navegação para o playground
    if (!page.url().includes('/playground')) {
        await page.goto('http://localhost:5300/playground?agentId=36');
        await page.waitForTimeout(2000);
    }

    // 3. Enviar pergunta inédita
    const chatInput = page.locator('textarea, input[placeholder*="Mensagem"]').first();
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    const uniqueQuestion = `como posso tirar duvidas com os professores ${Date.now()}?`;
    await chatInput.fill(uniqueQuestion);

    const sendBtn = page.locator('button[aria-label="Enviar mensagem"], button:has-text("🚀")').first();
    if (await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    // 4. Aguardar resposta e clicar no 👍
    const thumbsUpBtn = page.locator('button.thumbs-up').first();
    await expect(thumbsUpBtn).toBeVisible({ timeout: 45000 });
    await thumbsUpBtn.click();
    await page.waitForTimeout(1000);

    // 5. Alternar para a aba "🔗 Vincular a Resposta Existente"
    const linkTabBtn = page.locator('[data-testid="tab-mode-link-btn"]');
    await expect(linkTabBtn).toBeVisible({ timeout: 5000 });
    await linkTabBtn.click();
    await page.waitForTimeout(800);

    // 6. Selecionar o item existente no dropdown
    const selectElem = page.locator('[data-testid="select-existing-cache-item"]');
    await expect(selectElem).toBeVisible({ timeout: 5000 });

    // Screenshot do Modal com a Opção de Vincular a Resposta Existente
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_link_to_existing_cache_modal.png'
    });

    // 7. Confirmar vinculação da pergunta
    const linkConfirmBtn = page.locator('[data-testid="confirm-link-cache-btn"]');
    await linkConfirmBtn.click();
    await page.waitForTimeout(2000);

    // 8. Screenshot do estado de sucesso
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_linked_successfully_state.png'
    });
});

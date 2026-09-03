import { test, expect } from '@playwright/test';

test('Validação E2E da Sub-Aba Dúvidas dos Leads e Variação no Cache Semântico', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Login
    await page.goto('http://localhost:5300/login');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('');
        await emailInput.fill('aryarajmarketing@gmail.com');
        await passInput.fill('');
        await passInput.fill('123456');
        await submitBtn.click();
        await page.waitForTimeout(3000);
    }

    // 2. Acessar diretamente o agente 36
    await page.goto('http://localhost:5300/agent/36');
    await page.waitForTimeout(3000);

    // 3. Clicar na aba do Cache Semântico
    const cacheTab = page.locator('button:has-text("Respostas Aprovadas (Cache)"), button:has-text("Cache Semântico")').first();
    await expect(cacheTab).toBeVisible({ timeout: 10000 });
    await cacheTab.click();
    await page.waitForTimeout(2000);

    // 4. Clicar na sub-aba "📥 Dúvidas dos Leads"
    const leadQuestionsSubTab = page.locator('[data-testid="subtab-lead-questions"]').first();
    await expect(leadQuestionsSubTab).toBeVisible({ timeout: 10000 });
    await leadQuestionsSubTab.click();
    await page.waitForTimeout(2500);

    // 5. Screenshot da lista de dúvidas dos leads sem transcrições de imagem
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_lead_questions_clean.png'
    });

    // 6. Clicar em "⚡ Adicionar ao Cache" no primeiro card de dúvida
    const addCacheBtn = page.locator('button:has-text("Adicionar ao Cache")').first();
    await expect(addCacheBtn).toBeVisible({ timeout: 5000 });
    await addCacheBtn.click();
    await page.waitForTimeout(1500);

    // 7. Clicar na aba "🔗 Vincular como Variação" no modal
    const tabModeLink = page.locator('[data-testid="tab-mode-link"]').first();
    await expect(tabModeLink).toBeVisible({ timeout: 5000 });
    await tabModeLink.click();
    await page.waitForTimeout(1000);

    // 8. Screenshot do modal com a aba "Vincular como Variação" aberta
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_modal_link_variation.png'
    });
});

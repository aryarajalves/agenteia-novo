import { test, expect } from '@playwright/test';

test('Validação E2E do Limiar de Similaridade Individual no Cache Semântico', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Acesso e login
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
        await page.waitForTimeout(2500);
    }

    // 2. Ir diretamente para o painel de configuração do agente 36
    await page.goto('http://localhost:5300/agent/36');
    await page.waitForTimeout(3000);

    // 3. Navegar para a aba "Respostas Aprovadas (Cache)"
    const cacheTab = page.locator('button:has-text("Respostas Aprovadas (Cache)")').first();
    await expect(cacheTab).toBeVisible({ timeout: 10000 });
    await cacheTab.click();
    await page.waitForTimeout(2000);

    // 5. Screenshot da lista de respostas salvas com os badges de similaridade
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_list_badges.png'
    });

    // 6. Abrir modal de Nova Resposta ou Editar
    const newResponseBtn = page.locator('button:has-text("Nova Resposta"), [data-testid="create-new-cache-btn"]').first();
    await expect(newResponseBtn).toBeVisible({ timeout: 10000 });
    await newResponseBtn.click();
    await page.waitForTimeout(1000);

    // 7. Validar controle de limiar de similaridade
    const customModeBtn = page.locator('[data-testid="threshold-mode-custom-btn"]').first();
    await expect(customModeBtn).toBeVisible({ timeout: 5000 });
    await customModeBtn.click();
    await page.waitForTimeout(500);

    const slider = page.locator('[data-testid="cache-threshold-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 5000 });

    // Screenshot do modal com o controle de similaridade individual ativo
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_modal_individual_threshold.png'
    });
});

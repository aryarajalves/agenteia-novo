import { test, expect } from '@playwright/test';

test('Validação E2E das Abas Internas Organizadas do Cache Semântico', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Acesso à página do Agente 36 na aba de Cache Semântico
    await page.goto('http://localhost:5300/agent/36?tab=semantic_cache');
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

    if (!page.url().includes('/agent/36')) {
        await page.goto('http://localhost:5300/agent/36');
        await page.waitForTimeout(2000);
    }

    // Clicar na aba Respostas Aprovadas (Cache)
    const cacheTabBtn = page.locator('button:has-text("Respostas Aprovadas"), button:has-text("Cache")').first();
    await expect(cacheTabBtn).toBeVisible({ timeout: 15000 });
    await cacheTabBtn.click();
    await page.waitForTimeout(1500);

    // 2. Validar Aba 1: 📋 Respostas no Cache (Ativa por padrão)
    const responsesSubTab = page.locator('[data-testid="subtab-cache-responses"]');
    await expect(responsesSubTab).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('[data-testid="semantic-cache-search-input"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const createBtn = page.locator('[data-testid="create-new-cache-btn"]');
    await expect(createBtn).toBeVisible({ timeout: 10000 });

    // Screenshot da Aba 1: Respostas no Cache
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_subtab_responses.png'
    });

    // 3. Alternar para a Aba 2: ⚙️ Configurações & Limiares
    const settingsSubTab = page.locator('[data-testid="subtab-cache-settings"]');
    await expect(settingsSubTab).toBeVisible({ timeout: 5000 });
    await settingsSubTab.click();
    await page.waitForTimeout(1000);

    // Validar controles da aba de configurações
    const toggleSwitch = page.locator('[data-testid="semantic-cache-toggle-switch"]');
    await expect(toggleSwitch).toBeAttached();

    const slider = page.locator('[data-testid="semantic-cache-threshold-slider"]');
    await expect(slider).toBeVisible({ timeout: 10000 });

    // Screenshot da Aba 2: Configurações & Limiares
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_subtab_settings.png'
    });
});

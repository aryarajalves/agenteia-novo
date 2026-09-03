import { test, expect } from '@playwright/test';

test('Validação de Alinhamento e Espaçamento do Botão Editar Prompt com Arena A/B Ativada', async ({ page }) => {
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

    // 2. Ativar switch Arena A/B Testing
    const arenaToggleClickable = page.locator('text=Arena A/B Testing').first();
    await expect(arenaToggleClickable).toBeVisible({ timeout: 15000 });
    await arenaToggleClickable.click();
    await page.waitForTimeout(1000);

    // 3. Validar visibilidade e integridade de todos os botões do header
    const editPromptBtn = page.locator('[data-testid="edit-prompt-header-btn"]').first();
    const exportBtn = page.locator('[data-testid="export-training-btn"]').first();
    const arenaChatTab = page.locator('[data-testid="arena-tab-chat"]').first();
    const arenaPromptTab = page.locator('[data-testid="arena-tab-prompt"]').first();

    await expect(editPromptBtn).toBeVisible({ timeout: 10000 });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await expect(arenaChatTab).toBeVisible({ timeout: 10000 });
    await expect(arenaPromptTab).toBeVisible({ timeout: 10000 });

    // 4. Capturar screenshot do header completo
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_arena_header_aligned.png'
    });
});

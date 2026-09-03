import { test, expect } from '@playwright/test';

test('Validação E2E de Variações de Perguntas Alternativas no Cache Semântico', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Acesso ao sistema
    await page.goto('http://localhost:5300/agent/36');
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

    // 2. Garantir navegação para o painel de configurações do agente (/agent/36)
    if (!page.url().includes('/agent/36')) {
        await page.goto('http://localhost:5300/agent/36');
        await page.waitForTimeout(2000);
    }

    // 3. Clicar na aba Respostas Aprovadas (Cache)
    const cacheTabBtn = page.locator('button.tab-btn:has-text("Respostas Aprovadas"), button.tab-btn:has-text("Cache")').first();
    await expect(cacheTabBtn).toBeVisible({ timeout: 15000 });
    await cacheTabBtn.click();
    await page.waitForTimeout(1500);

    // 4. Localizar botão de editar no primeiro card
    const editBtn = page.locator('button:has-text("✏️ Editar")').first();
    await expect(editBtn).toBeVisible({ timeout: 15000 });
    await editBtn.click();
    await page.waitForTimeout(1000);

    // 5. Validar abertura do modal de edição com campo de variações
    const altInput = page.locator('[data-testid="edit-cache-alt-input"]');
    const addAltBtn = page.locator('[data-testid="edit-add-alt-btn"]');

    await expect(altInput).toBeVisible({ timeout: 5000 });
    await expect(addAltBtn).toBeVisible({ timeout: 5000 });

    // 6. Adicionar duas variações de pergunta
    await altInput.fill('o curso é online ou presencial?');
    await addAltBtn.click();
    await page.waitForTimeout(400);

    await altInput.fill('como são transmitidas as aulas?');
    await addAltBtn.click();
    await page.waitForTimeout(400);

    // Screenshot do Modal com as Variações Adicionadas
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_modal_with_alternate_queries.png'
    });

    // 7. Salvar Alterações
    const saveBtn = page.locator('[data-testid="save-edit-cache-btn"]');
    await saveBtn.click();
    await page.waitForTimeout(2500);

    // 8. Screenshot do Card na lista exibindo as tags de variações
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_card_with_alternate_queries.png'
    });
});

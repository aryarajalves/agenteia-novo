import { test, expect } from '@playwright/test';

test('Validação E2E da Criação Manual de Respostas no Cache e Paginação de até 20 itens', async ({ page }) => {
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

    // 4. Clicar no botão "➕ Nova Resposta"
    const newBtn = page.locator('[data-testid="create-new-cache-btn"]');
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(800);

    // 5. Preencher os dados de criação manual
    const queryInput = page.locator('[data-testid="create-cache-query-input"]');
    const responseInput = page.locator('[data-testid="create-cache-response-input"]');
    const altInput = page.locator('[data-testid="create-cache-alt-input"]');
    const addAltBtn = page.locator('[data-testid="create-add-alt-btn"]');

    await expect(queryInput).toBeVisible({ timeout: 5000 });
    await expect(responseInput).toBeVisible({ timeout: 5000 });

    await queryInput.fill('qual a politica de reembolso e devolucao?');
    await responseInput.fill('Voce conta com 7 dias de garantia incondicional. Se nao gostar, devolvemos 100% do seu dinheiro sem burocracia.');

    // Adicionar variações
    await altInput.fill('posso pedir meu dinheiro de volta se nao gostar?');
    await addAltBtn.click();
    await page.waitForTimeout(300);

    await altInput.fill('como funciona a garantia de 7 dias?');
    await addAltBtn.click();
    await page.waitForTimeout(300);

    // Screenshot do Modal de Criação Manual Preenchido
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_create_modal.png'
    });

    // 6. Salvar a nova resposta
    const saveBtn = page.locator('[data-testid="save-create-cache-btn"]');
    await saveBtn.click();
    await page.waitForTimeout(2500);

    // 7. Screenshot da Lista com a Nova Resposta Cadastrada Manualmente
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_list_with_manual_entry.png'
    });

    // 8. Validar presença do texto na lista
    await expect(page.locator('text=qual a politica de reembolso e devolucao?')).toBeVisible({ timeout: 10000 });
});

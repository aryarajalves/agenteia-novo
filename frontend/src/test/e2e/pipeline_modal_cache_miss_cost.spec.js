import { test, expect } from '@playwright/test';

test('Validação E2E: Evento com Cache Miss e custo de IA não exibe Custo Zero nem badge de cache nos tokens', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Acesso à página de webhooks
    await page.goto('http://localhost:5300/webhooks');
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

    if (!page.url().includes('/webhooks')) {
        await page.goto('http://localhost:5300/webhooks', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
    }

    // 2. Abrir Leads / Contatos
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    await expect(contatosBtn).toBeVisible({ timeout: 15000 });
    await contatosBtn.click();
    await page.waitForTimeout(2000);

    // 3. Abrir histórico do lead
    const historyLeadBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
    if (await historyLeadBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await historyLeadBtn.click();
        await page.waitForTimeout(2000);
    } else {
        const leadCard = page.locator('.lead-card-premium').first();
        if (await leadCard.isVisible()) {
            await leadCard.click();
            await page.waitForTimeout(1000);
            const expandHistoryBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
            await expandHistoryBtn.click();
            await page.waitForTimeout(2000);
        }
    }

    // 4. Clicar no botão '⚡' (Ver Pipeline) do evento com Cache Miss ("Quero comprar agora esse curso")
    const missRow = page.locator('tr:has-text("Quero comprar agora esse curso"), tr:has-text("Como funciona e quanto custa")').first();
    if (await missRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const pipelineBtn = missRow.locator('button[title="Ver Pipeline"]').first();
        await pipelineBtn.click();
    } else {
        const pipelineBtn = page.locator('button[title="Ver Pipeline"]').first();
        await pipelineBtn.click();
    }
    await page.waitForTimeout(2000);

    // 5. Validar que o modal do Pipeline abriu
    const pipelineTitle = page.locator('text=Pipeline').first();
    await expect(pipelineTitle).toBeVisible({ timeout: 10000 });

    // 6. Screenshot do Pipeline com a correção aplicada
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/pipeline_cache_miss_corrected.png'
    });

    // 7. Validações estritas de Integridade Financeira:
    // O badge "Custo Zero" NÃO pode estar visível no bloco de Custo Total
    const headerCustoTotal = page.locator('[data-testid="summary-cost"]');
    const custoZeroInHeader = headerCustoTotal.locator('span:has-text("Custo Zero")');
    expect(await custoZeroInHeader.count()).toBe(0);

    // O badge de Cache Semântico NÃO pode estar visível no bloco de Tokens para eventos que consumiram tokens de IA
    const headerTokens = page.locator('[data-testid="summary-tokens"]');
    const cacheSemanticoInTokens = headerTokens.locator('span:has-text("Cache Semântico")');
    expect(await cacheSemanticoInTokens.count()).toBe(0);

    // O card do passo de verificação do cache deve indicar que a similaridade foi insuficiente (e nunca Custo Zero)
    const insufficientBadge = page.locator('span:has-text("SIMILARIDADE INSUFICIENTE")').first();
    await expect(insufficientBadge).toBeVisible();
});

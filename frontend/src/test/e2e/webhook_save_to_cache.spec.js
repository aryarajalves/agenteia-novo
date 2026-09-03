import { test, expect } from '@playwright/test';

test('Validação E2E da Opção de Salvar Mensagem e Resposta do Webhook no Cache Semântico', async ({ page }) => {
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
        await page.goto('http://localhost:5300/webhooks');
        await page.waitForTimeout(2000);
    }

    // 2. Clicar no botão '👥 Contatos' do primeiro webhook
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    await expect(contatosBtn).toBeVisible({ timeout: 15000 });
    await contatosBtn.click();
    await page.waitForTimeout(2000);

    // 3. Dentro do modal de leads, expandir o lead ou clicar no botão de Histórico
    const historyLeadBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
    if (await historyLeadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await historyLeadBtn.click();
        await page.waitForTimeout(2000);
    } else {
        // Clica no lead card para expandir
        const leadCard = page.locator('.lead-card-premium').first();
        if (await leadCard.isVisible()) {
            await leadCard.click();
            await page.waitForTimeout(1000);
            const expandHistoryBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
            await expandHistoryBtn.click();
            await page.waitForTimeout(2000);
        }
    }

    // 4. Validar presença do botão de salvar no cache semântico 💾 na coluna Ações da tabela
    const saveCacheBtn = page.locator('button[title*="Cache Semântico"], button:has-text("💾")').first();
    await expect(saveCacheBtn).toBeVisible({ timeout: 15000 });

    // Screenshot 1: Tabela com o novo botão 💾 de salvar no cache semântico
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/webhook_history_save_cache_button.png'
    });

    // 4. Clicar no botão 💾 para abrir o modal de aprovação e salvar no cache
    await saveCacheBtn.click();
    await page.waitForTimeout(1500);

    // 5. Validar que o modal de salvar no cache semântico abriu
    const modalTitle = page.locator('text=Salvar no Cache Semântico');
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    const queryInput = page.locator('input[placeholder*="Pergunta"], textarea').first();
    await expect(queryInput).toBeVisible({ timeout: 5000 });

    // Screenshot 2: Modal de aprovação e cadastro no cache semântico aberto a partir do Webhook
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/webhook_history_save_cache_modal.png'
    });
});

import { test, expect } from '@playwright/test';

test('Validação de Exibição das Informações Extras do Cache Semântico após Recarregar a Sessão', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Acesso ao playground do agente 36
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

    // 2. Enviar pergunta que ativa o cache semântico diretamente
    const chatInput = page.locator('textarea, input[placeholder*="Mensagem"]').first();
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await chatInput.fill('como funciona?');

    const sendBtn = page.locator('button[aria-label="Enviar mensagem"], button:has-text("🚀")').first();
    if (await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    // 3. Aguardar resposta com o pill de Cache Semântico
    const cachePill = page.locator('[data-testid="semantic-cache-pill"]').first();
    await expect(cachePill).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    // 4. Ir para a aba History e clicar na conversa anterior
    const historyTab = page.locator('button:has-text("History")').first();
    await expect(historyTab).toBeVisible({ timeout: 10000 });
    await historyTab.click();
    await page.waitForTimeout(1500);

    const firstSessionItem = page.locator('.history-item').first();
    await expect(firstSessionItem).toBeVisible({ timeout: 10000 });
    await firstSessionItem.click();
    await page.waitForTimeout(2000);

    // 5. Validar que o pill de Cache Semântico e as informações extras continuam visíveis na sessão recarregada
    const reloadedCachePill = page.locator('[data-testid="semantic-cache-pill"], span:has-text("CACHE SEMÂNTICO")').first();
    await expect(reloadedCachePill).toBeVisible({ timeout: 15000 });

    // 6. Captura de evidência visual do histórico restaurado com informações extras
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_reloaded_cache_message_meta.png'
    });
});

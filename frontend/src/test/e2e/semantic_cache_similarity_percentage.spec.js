import { test, expect } from '@playwright/test';

test('Validação da Exibição da Porcentagem de Similaridade no Cache Semântico e Raio-X', async ({ page }) => {
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

    // 2. Enviar a pergunta "possui certificado ??" (variação semântica)
    const chatInput = page.locator('textarea, input[placeholder*="Mensagem"]').first();
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await chatInput.fill('possui certificado ??');

    const sendBtn = page.locator('button[aria-label="Enviar mensagem"], button:has-text("🚀")').first();
    if (await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    // 3. Aguardar resposta com o pill de Cache Semântico exibindo a porcentagem
    const cachePill = page.locator('[data-testid="semantic-cache-pill"]').first();
    await expect(cachePill).toBeVisible({ timeout: 30000 });
    await expect(cachePill).toContainText('%');
    await page.waitForTimeout(1000);

    // Screenshot 1: Mensagem com o Pill exibindo a porcentagem de similaridade
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_cache_similarity_pill.png'
    });

    // 4. Abrir o Raio-X para ver o detalhamento completo
    const raioXBtn = page.locator('[data-testid="raio-x-toggle-btn"]').first();
    await expect(raioXBtn).toBeVisible({ timeout: 5000 });
    await raioXBtn.click();
    await page.waitForTimeout(1000);

    const cacheDetailsBox = page.locator('[data-testid="debug-semantic-cache-details"]').first();
    await expect(cacheDetailsBox).toBeVisible({ timeout: 5000 });
    await cacheDetailsBox.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    // Screenshot 2: Raio-X Aberto com o Card de Detalhamento da Similaridade
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_cache_similarity_raiox.png'
    });
});

import { test, expect } from '@playwright/test';

test('Validação de que mensagens disparadas por Follow-Up não possuem o botão salvar no cache (💾)', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Interceptar a chamada de detalhe/lista de eventos para garantir que rows de Follow-Up e normais estejam presentes
    await page.route('**/webhooks/**/events**', async (route) => {
        const response = await route.fetch();
        const json = await response.json();

        const testEvents = [
            {
                id: 404,
                dono: 'agente',
                event_type: 'followup',
                mensagem: '[Follow-Up Passo #2]',
                agent_response: '[Template Oficial]: compra_aprovada',
                message_type: 'text',
                created_at: '2026-08-27T08:34:53'
            },
            {
                id: 403,
                dono: 'agente',
                event_type: 'followup',
                mensagem: '[Follow-Up Passo #1]',
                agent_response: '[Template Oficial]: combo_produto_oficial',
                message_type: 'text',
                created_at: '2026-08-26T19:35:30'
            },
            {
                id: 402,
                dono: 'usuario',
                event_type: 'message',
                mensagem: 'olá, como funciona a entrega?',
                agent_response: 'A entrega é feita via transportadora ou correios com rastreamento.',
                message_type: 'text',
                created_at: '2026-08-26T19:30:00'
            }
        ];

        const payload = {
            items: testEvents,
            events: testEvents,
            total: testEvents.length,
            page: 1,
            limit: 20
        };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    });

    // 2. Acesso à página de webhooks
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

    // 3. Abrir Leads / Contatos
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    await expect(contatosBtn).toBeVisible({ timeout: 15000 });
    await contatosBtn.click();
    await page.waitForTimeout(2000);

    // 4. Abrir histórico do lead
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

    // 5. Validar que as linhas de Follow-Up (404 e 403) NÃO possuem botão salvar cache (💾)
    const row404 = page.locator('tr:has-text("404")').first();
    await expect(row404).toBeVisible({ timeout: 10000 });
    const cacheBtn404 = row404.locator('button:has-text("💾"), button[title*="Cache Semântico"]');
    await expect(cacheBtn404).toHaveCount(0);

    const row403 = page.locator('tr:has-text("403")').first();
    await expect(row403).toBeVisible({ timeout: 10000 });
    const cacheBtn403 = row403.locator('button:has-text("💾"), button[title*="Cache Semântico"]');
    await expect(cacheBtn403).toHaveCount(0);

    // 6. Validar que a linha normal (402) POSSUI o botão de salvar cache (💾)
    const row402 = page.locator('tr:has-text("402")').first();
    await expect(row402).toBeVisible({ timeout: 10000 });
    const cacheBtn402 = row402.locator('button:has-text("💾"), button[title*="Cache Semântico"]');
    await expect(cacheBtn402).toHaveCount(1);

    // 7. Captura de tela comparativa comprovando que linhas de follow-up não exibem o botão 💾
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/webhook_followup_no_cache_button.png'
    });
});

import { test, expect } from '@playwright/test';

test('Validação de que o histórico exibe se a mensagem saiu de graça (Cache Semântico) ou paga (IA)', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Interceptar a chamada de eventos para garantir os dados exatamente como na imagem do usuário
    await page.route('**/webhooks/**/events**', async (route) => {
        const testEvents = [
            {
                id: 413,
                dono: 'usuario',
                event_type: 'message',
                message_type: 'text',
                mensagem: 'Como funciona o curso?',
                agent_response: 'O curso é 100% online e você tem acesso vitalício a todo o conteúdo.',
                from_semantic_cache: true,
                cost: 0.0,
                created_at: '2026-09-02T09:14:15'
            },
            {
                id: 412,
                dono: 'usuario',
                event_type: 'message',
                message_type: 'text',
                mensagem: 'Olá! Quero saber mais sobre o método laser day',
                agent_response: 'oiee! Qual sua dúvida sobre o Método Laser Day?',
                from_semantic_cache: true,
                cost: 0.0,
                created_at: '2026-09-02T09:12:08'
            },
            {
                id: 411,
                dono: 'usuario',
                event_type: 'message',
                message_type: 'text',
                mensagem: 'Olá! Quero saber mais sobre o método laser day',
                agent_response: 'Combinado! Se surgir qualquer dúvida sobre o Método Laser Day, é só me chamar.',
                from_semantic_cache: false,
                cost: 0.2168,
                created_at: '2026-09-02T08:55:43'
            },
            {
                id: 410,
                dono: 'agente',
                event_type: 'followup',
                message_type: 'text',
                mensagem: '[Follow-Up Passo #1]',
                agent_response: '[Template Oficial]: combo_produto_oficial',
                cost: 0.0,
                created_at: '2026-09-02T08:53:26'
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

    // 5. Validar que as linhas 413 e 412 mostram que saíram de graça (Cache Semântico)
    const row413 = page.locator('tr:has-text("413")').first();
    await expect(row413).toBeVisible({ timeout: 10000 });
    await expect(row413.locator('text=De Graça (Cache Semântico · R$ 0,00)').first()).toBeVisible();

    const row412 = page.locator('tr:has-text("412")').first();
    await expect(row412).toBeVisible({ timeout: 10000 });
    await expect(row412.locator('text=De Graça (Cache Semântico · R$ 0,00)').first()).toBeVisible();

    // 6. Validar que a linha 411 mostra que foi paga (IA)
    const row411 = page.locator('tr:has-text("411")').first();
    await expect(row411).toBeVisible({ timeout: 10000 });
    await expect(row411.locator('text=Paga (IA · R$ 0,22)').first()).toBeVisible();

    // 7. Captura de tela da tabela de histórico com os badges de De Graça vs Paga
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/lead_history_cost_cache_badges.png'
    });
});

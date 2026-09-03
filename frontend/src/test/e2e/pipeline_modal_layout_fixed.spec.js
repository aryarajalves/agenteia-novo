import { test, expect } from '@playwright/test';

test('Validação E2E da largura ampliada do Pipeline e alinhamento dos botões', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Interceptar a chamada de detalhe/lista de eventos para injetar passos
    await page.route(url => url.toString().includes(':8002') && url.pathname.includes('/events'), async (route) => {
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
                created_at: '2026-09-02T09:14:15',
                processing_steps: JSON.stringify([
                    {
                        step: "⏱️ Agrupamento Ativo",
                        detail: "Aguardando 3s para ver se o usuário envia mais mensagens.",
                        duration: "3.1s",
                        time: "09:14:15"
                    },
                    {
                        step: "⚡ Cache Semântico (96.1% Similaridade · Custo Zero)",
                        detail: "Hit de Alta Precisão (96.1% >= 85.0%). Resposta oficial aprovada encontrada no cache.",
                        duration: "45ms",
                        time: "09:14:18",
                        metadata: { from_semantic_cache: true, cost: 0.0, similarity: 0.961 }
                    },
                    {
                        step: "⚡ Resposta do Cache Semântico (96.1% Similaridade · Custo Zero)",
                        detail: "O curso é 100% online e você tem acesso vitalício a todo o conteúdo.",
                        duration: "10ms",
                        time: "09:14:18",
                        metadata: { from_semantic_cache: true, cost: 0.0 }
                    }
                ])
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
    await page.goto('http://localhost:5300/webhooks', { waitUntil: 'domcontentloaded' });
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

    // 5. Clicar no botão '⚡' (Ver Pipeline)
    const pipelineBtn = page.locator('button[title="Ver Pipeline"]').first();
    await expect(pipelineBtn).toBeVisible({ timeout: 10000 });
    await pipelineBtn.click();
    await page.waitForTimeout(2000);

    // 6. Validar que o modal do Pipeline abriu
    const pipelineTitle = page.locator('text=Pipeline').first();
    await expect(pipelineTitle).toBeVisible({ timeout: 10000 });

    // 7. Validar visibilidade dos botões de filtro e do botão Recolher Todos
    await expect(page.locator('button:has-text("Cache Semântico")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Recolher Todos"), button:has-text("Expandir Todos")').first()).toBeVisible();

    // 8. Screenshot do Pipeline com botões organizados e largura ampliada
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/pipeline_semantic_cache_view.png'
    });
});

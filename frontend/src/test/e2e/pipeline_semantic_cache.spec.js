import { test, expect } from '@playwright/test';

test('Validação E2E da exibição do Cache Semântico no Pipeline de Automação', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Interceptar a chamada de detalhe/lista de eventos para injetar passos de Cache Semântico
    await page.route('**/webhooks/**/events**', async (route) => {
        const response = await route.fetch();
        const json = await response.json();

        const cacheSteps = [
            {
                step: "🚀 Iniciando Pipeline",
                detail: "A tarefa de automação foi iniciada pelo worker.",
                timestamp: "2026-08-27T08:52:41.000Z"
            },
            {
                step: "⚡ Cache Semântico (96.5% Similaridade · Custo Zero)",
                detail: "🎯 Hit de Alta Precisão (96.5% >= 92.0%)\n\n• Pergunta Identificada: \"obrigado\"\n• Similaridade Vetorial: 96.5%\n• Limiar Mínimo Exigido: 92.0%\n• Origem: Resposta aprovada no Cache Semântico\n• Economia de Recursos: 0 Tokens de LLM consumidos (R$ 0,00)\n\n💬 Resposta Entregue pelo Cache:\nPor nada! Se precisar de mais alguma coisa, é só chamar.",
                timestamp: "2026-08-27T08:52:41.050Z",
                metadata: {
                    from_semantic_cache: true,
                    cache_id: 1,
                    similarity: 0.965,
                    similarity_pct: "96.5%",
                    threshold: 0.92,
                    original_query: "obrigado",
                    cost: 0.0,
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cached_tokens: 0 }
                }
            },
            {
                step: "⚡ Resposta do Cache Semântico (96.5% Similaridade · Custo Zero)",
                detail: "Por nada! Se precisar de mais alguma coisa, é só chamar.",
                timestamp: "2026-08-27T08:52:41.100Z",
                metadata: {
                    from_semantic_cache: true,
                    cached_similarity_pct: "96.5%",
                    cost: 0.0,
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                }
            }
        ];

        if (Array.isArray(json)) {
            if (json.length > 0) {
                json[0].processing_steps = JSON.stringify(cacheSteps);
                json[0].agent_response = "Por nada! Se precisar de mais alguma coisa, é só chamar.";
            }
        } else if (json && json.events && Array.isArray(json.events)) {
            if (json.events.length > 0) {
                json.events[0].processing_steps = JSON.stringify(cacheSteps);
                json.events[0].agent_response = "Por nada! Se precisar de mais alguma coisa, é só chamar.";
            }
        } else if (json && json.id) {
            json.processing_steps = JSON.stringify(cacheSteps);
            json.agent_response = "Por nada! Se precisar de mais alguma coisa, é só chamar.";
        }

        await route.fulfill({ response, json });
    });

    // 2. Acesso e login
    await page.goto('http://localhost:5300/login');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('');
        await emailInput.fill('aryarajmarketing@gmail.com');
        await passInput.fill('');
        await passInput.fill('123456');
        await submitBtn.click();
        await page.waitForTimeout(2000);
    }

    // 3. Ir para webhooks
    await page.goto('http://localhost:5300/webhooks');
    await page.waitForTimeout(2000);

    // 4. Abrir Leads / Contatos
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    await expect(contatosBtn).toBeVisible({ timeout: 15000 });
    await contatosBtn.click();
    await page.waitForTimeout(2000);

    // 5. Abrir histórico do lead
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

    // 6. Clicar no botão '⚡ Ver Pipeline' na tabela de histórico do lead
    const pipelineBtn = page.locator('button[title="Ver Pipeline"]').first();
    await expect(pipelineBtn).toBeVisible({ timeout: 15000 });
    await pipelineBtn.click();
    await page.waitForTimeout(2000);

    // 7. Validar que o modal do Pipeline abriu e está exibindo informações de Cache Semântico
    const pipelineTitle = page.locator('text=Pipeline').first();
    await expect(pipelineTitle).toBeVisible({ timeout: 10000 });

    // Validar badge de Cache Semântico na barra superior
    const cacheSummaryPill = page.locator('text=Cache Semântico').first();
    await expect(cacheSummaryPill).toBeVisible({ timeout: 10000 });

    // Screenshot 1 do Pipeline com Cache Semântico destacado
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/pipeline_semantic_cache_view.png'
    });

    // 8. Clicar na aba de filtro '⚡ Cache Semântico' para visualizar o passo aberto
    const cacheFilterTab = page.locator('button:has-text("Cache Semântico")').first();
    await expect(cacheFilterTab).toBeVisible({ timeout: 10000 });
    await cacheFilterTab.click();
    await page.waitForTimeout(1000);

    // Screenshot 2: Visualização isolada e detalhada do passo de Cache Semântico
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/pipeline_semantic_cache_step_detail.png'
    });
});

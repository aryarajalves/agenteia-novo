import { test, expect } from '@playwright/test';

test('Validação E2E: Exibição detalhada das perguntas do usuário e similaridades no card de Cache Semântico não aprovado', async ({ page }) => {
    test.setTimeout(120000);

    const mockEventDiagnostics = {
        id: 420,
        webhook_config_id: 1,
        conta_id: '1',
        conversa_id: '100',
        telefone: '+55 (85) 99825-9497',
        contato_nome: 'Aryaraj Fernandes',
        event_type: 'message',
        message_type: 'text',
        mensagem: 'Como funciona e quanto custa o curso?',
        agent_response: 'Nosso curso é 100% online com acesso vitalício.',
        status: 'completed',
        cost: 0.1977,
        created_at: '2026-09-02T13:45:00.000Z',
        processing_steps: JSON.stringify([
            {
                step: '🔍 Verificação de Cache Semântico (70.7% Similaridade)',
                detail: 'Nenhuma resposta cadastrada atingiu a similaridade mínima necessária para aprovação automática.\n\n📋 **Dúvidas do Usuário Analisadas:**\n• **Pergunta 1:** "Como funciona"\n  ↳ **Mais Próxima no Cache:** "como funciona o curso?"\n  ↳ **Similaridade Encontrada:** 96.2% (Limiar Exigido: 85.0%) [✅ Atingiu Limiar]\n• **Pergunta 2:** "quanto custa o curso?"\n  ↳ **Mais Próxima no Cache:** "qual o valor da formação?"\n  ↳ **Similaridade Encontrada:** 70.7% (Limiar Exigido: 85.0%) [❌ Não Atingiu]\n\n• **Similaridade Máxima Encontrada:** 70.7%\n• **Limiar Mínimo Exigido:** 85.0%\n• **Ação:** Encaminhando pergunta para análise do Pre-Router e IA.',
                timestamp: '2026-09-02T13:45:01.000Z',
                category: 'cache',
                metadata: {
                    from_semantic_cache: false,
                    max_similarity: 0.707,
                    similarity_pct: '70.7%',
                    threshold: 0.85,
                    user_query: 'Como funciona e quanto custa o curso?',
                    queries_evaluated: [
                        {
                            sub_query: 'Como funciona',
                            matched_query: 'como funciona o curso?',
                            similarity_pct: '96.2%',
                            threshold_pct: '85.0%',
                            approved: true
                        },
                        {
                            sub_query: 'quanto custa o curso?',
                            matched_query: 'qual o valor da formação?',
                            similarity_pct: '70.7%',
                            threshold_pct: '85.0%',
                            approved: false
                        }
                    ]
                }
            },
            {
                step: '✅ Decisão da IA (Pre-Router)',
                detail: 'Encaminhando para agente especializado.',
                timestamp: '2026-09-02T13:45:02.000Z',
                category: 'ai',
                metadata: { cost: 0.02, usage: { total_tokens: 1500 } }
            },
            {
                step: '✅ Resposta gerada pelo agente',
                detail: 'Nosso curso é 100% online com acesso vitalício.',
                timestamp: '2026-09-02T13:45:05.000Z',
                category: 'ai',
                metadata: { cost: 0.1777, usage: { total_tokens: 24507 } }
            }
        ])
    };

    // 1. Interceptar endpoints de eventos para garantir o retorno com diagnóstico
    await page.route('**/webhooks/**/events**', async (route) => {
        const url = route.request().url();
        if (url.includes('/events/420')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockEventDiagnostics)
            });
            return;
        }

        const payload = {
            items: [mockEventDiagnostics],
            events: [mockEventDiagnostics],
            total: 1,
            page: 1,
            limit: 20
        };
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(payload)
        });
    });

    // 2. Acesso ao painel
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

    // 3. Abrir Contatos / Histórico
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    await expect(contatosBtn).toBeVisible({ timeout: 15000 });
    await contatosBtn.click();
    await page.waitForTimeout(2000);

    const historyLeadBtn = page.locator('button:has-text("Histórico"), button[title*="Histórico"]').first();
    if (await historyLeadBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await historyLeadBtn.click();
        await page.waitForTimeout(2000);
    }

    // 4. Clicar no botão '⚡' para abrir o Pipeline
    const pipelineBtn = page.locator('button[title="Ver Pipeline"]').first();
    await expect(pipelineBtn).toBeVisible({ timeout: 10000 });
    await pipelineBtn.click();
    await page.waitForTimeout(2500);

    // 5. Clicar na aba de filtro "⚡ Cache Semântico" para focar no passo
    const cacheTab = page.locator('button:has-text("Cache Semântico")').first();
    if (await cacheTab.isVisible()) {
        await cacheTab.click();
        await page.waitForTimeout(1000);
    }

    // 6. Configurar viewport e rolar levemente para capturar ambas as perguntas no print
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
        const el = document.querySelector('.premium-modal-content');
        if (el) el.scrollTop = 140;
    });
    await page.waitForTimeout(1000);

    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/pipeline_cache_miss_questions_similarity.png'
    });

    // 7. Validações estritas dos elementos na tela:
    // Deve mostrar o bloco de diagnóstico de dúvidas analisadas
    const diagBlock = page.locator('text=Dúvidas Analisadas no Cache Semântico').first();
    await expect(diagBlock).toBeVisible();

    // Deve mostrar a pergunta 1 que o usuário fez e sua similaridade
    const q1 = page.getByText('Como funciona', { exact: false }).first();
    await expect(q1).toBeVisible();

    const sim1 = page.getByText('Aprovada (96.2%)').first();
    await expect(sim1).toBeVisible();

    // Deve mostrar a pergunta 2 que o usuário fez e sua similaridade
    const q2 = page.getByText('quanto custa o curso?').first();
    await expect(q2).toBeVisible();

    const sim2 = page.getByText('70.7% < 85.0%').first();
    await expect(sim2).toBeVisible();

    // Deve mostrar a correspondência mais próxima encontrada no cache
    const match2 = page.getByText('qual o valor da formação?').first();
    await expect(match2).toBeVisible();
});

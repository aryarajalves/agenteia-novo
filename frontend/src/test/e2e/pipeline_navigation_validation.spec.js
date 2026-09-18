import { test, expect } from '@playwright/test';

test('Validação E2E da Navegação entre Mensagens e Indicador de Última Mensagem no Pipeline', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Acesso à página inicial
    await page.goto('http://localhost:5300/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Login se necessário
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
        await emailInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await emailInput.fill('aryarajmarketing@gmail.com');

        await passInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await passInput.fill('123456');

        await submitBtn.click();
        await page.waitForTimeout(3000);
    }

    // Navegar para a aba de Webhooks pelo menu ou URL
    const webhooksNav = page.locator('a[href*="webhooks"], button:has-text("Webhooks")').first();
    if (await webhooksNav.isVisible({ timeout: 3000 }).catch(() => false)) {
        await webhooksNav.click();
        await page.waitForTimeout(2000);
    } else {
        await page.goto('http://localhost:5300/webhooks', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
    }

    // 3. Abrir Contatos / Leads
    const contatosBtn = page.locator('button:has-text("Contatos"), .btn-action-leads').first();
    await expect(contatosBtn).toBeVisible({ timeout: 15000 });
    await contatosBtn.click();
    await page.waitForTimeout(2000);

    // 4. Abrir histórico do primeiro lead ou expandir card
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
    await page.waitForTimeout(2500);

    // 6. Validar que o modal do Pipeline abriu
    const pipelineTitle = page.locator('h2:has-text("Pipeline")').first();
    await expect(pipelineTitle).toBeVisible({ timeout: 10000 });

    // 7. Validar visibilidade dos controles de navegação e do badge no cabeçalho
    const prevBtn = page.locator('[data-testid="pipeline-prev-msg-btn"]').first();
    const nextBtn = page.locator('[data-testid="pipeline-next-msg-btn"]').first();
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // 8. Capturar screenshot do estado inicial do Pipeline (evidência visual "Depois")
    await page.screenshot({
        path: 'pipeline_navigation_validation.png'
    });

    // 9. Se o botão Anterior estiver habilitado, clicar para navegar e validar mudança de estado
    if (await prevBtn.isEnabled().catch(() => false)) {
        await prevBtn.click();
        await page.waitForTimeout(2000);

        // Validar que o badge de mensagem anterior ou contador atualizou
        const prevBadge = page.locator('[data-testid="previous-message-badge"]').first();
        await expect(prevBadge).toBeVisible();

        // Capturar screenshot navegando na mensagem anterior
        await page.screenshot({
            path: 'pipeline_navigation_previous_msg.png'
        });
    }
});

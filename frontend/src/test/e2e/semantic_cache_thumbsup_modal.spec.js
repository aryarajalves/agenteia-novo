import { test, expect } from '@playwright/test';

test('Validação E2E do Popup de Confirmação com Opção de Maximizar e Edição', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Acesso ao sistema
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

    // 2. Garantir que estamos no playground
    if (!page.url().includes('/playground')) {
        await page.goto('http://localhost:5300/playground?agentId=36');
        await page.waitForTimeout(2000);
    }

    // 3. Enviar uma pergunta inédita
    const chatInput = page.locator('textarea, input[placeholder*="Mensagem"]').first();
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    const uniqueQuestion = `qual o suporte oferecido durante as aulas ao vivo ${Date.now()}?`;
    await chatInput.fill(uniqueQuestion);

    const sendBtn = page.locator('button[aria-label="Enviar mensagem"], button:has-text("🚀")').first();
    if (await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    // Aguardar resposta do agente e o botão 👍
    const thumbsUpBtn = page.locator('button.thumbs-up').first();
    await expect(thumbsUpBtn).toBeVisible({ timeout: 45000 });

    // 4. Clicar no botão 👍 para abrir o popup de confirmação
    await thumbsUpBtn.click();
    await page.waitForTimeout(1000);

    // Validar que os campos editáveis estão presentes no modal
    const queryInput = page.locator('[data-testid="approve-cache-query-input"]');
    const responseInput = page.locator('[data-testid="approve-cache-response-input"]');
    const maximizeBtn = page.locator('[data-testid="toggle-maximize-response-btn"]');

    await expect(queryInput).toBeVisible({ timeout: 5000 });
    await expect(responseInput).toBeVisible({ timeout: 5000 });
    await expect(maximizeBtn).toBeVisible({ timeout: 5000 });

    // 5. Clicar no botão para Maximizar o campo de resposta
    await maximizeBtn.click();
    await page.waitForTimeout(600);

    // Screenshot do Popup com o Campo de Resposta Maximizado
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_thumbs_up_maximized_modal.png'
    });

    // 6. Editar a pergunta e a resposta no modo maximizado
    await queryInput.fill('qual o suporte oferecido no curso?');
    await responseInput.fill('O Método Laser Day oferece suporte individual via WhatsApp diretamente com os instrutores e comunidade de alunos.');

    // 7. Confirmar e Salvar no Cache
    const confirmBtn = page.locator('[data-testid="confirm-approve-cache-btn"]');
    await confirmBtn.click();
    await page.waitForTimeout(2000);

    // Validar indicador de salvo no cache
    await expect(page.locator('text=Salvo no Cache')).toBeVisible({ timeout: 8000 });

    // Screenshot do estado após salvar com sucesso
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/playground_saved_to_cache_after_editing_modal.png'
    });
});

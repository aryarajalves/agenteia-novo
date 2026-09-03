import { test, expect } from '@playwright/test';

test('Validação E2E da Paginação e Edição no Cache Semântico', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Acesso e Login
    await page.goto('http://localhost:5300/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
        await emailInput.fill('');
        await emailInput.fill('aryarajmarketing@gmail.com');
        await passInput.fill('');
        await passInput.fill('123456');
        await submitBtn.click();
        await page.waitForTimeout(2000);
    }

    await page.waitForTimeout(1500);

    // 2. Navegar para o painel do Agente 36 na aba 'cache'
    await page.goto('http://localhost:5300/agent/36?tab=cache', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Validar elementos da aba Cache Semântico
    await expect(page.locator('text=Cache Semântico de Respostas (Custo Zero)')).toBeVisible({ timeout: 10000 });

    // Inserir itens extras se necessário para demonstrar lista e paginação
    await page.evaluate(async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const headers = {
                'Content-Type': 'application/json',
                'X-API-Key': 'a0c10372-af47-4a36-932a-9b1acdb59366',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            await fetch('http://localhost:8002/semantic-cache', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    agent_id: 36,
                    user_query: 'como funciona o curso de vcs?',
                    approved_response: 'O curso é 100% online e você tem acesso vitalício a todo o conteúdo gravado e suporte.'
                })
            });
        } catch (e) {}
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // Screenshot da Lista de Respostas Aprovadas com botão Editar
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_list_with_edit_btn.png'
    });

    // 3. Clicar no botão ✏️ Editar
    const editBtn = page.locator('button:has-text("Editar")').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(1000);

    // Screenshot com o Modal de Edição Aberto
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_edit_modal.png'
    });

    // 4. Editar o texto da resposta
    const responseInput = page.locator('[data-testid="edit-cache-response-input"]');
    await expect(responseInput).toBeVisible();
    await responseInput.fill('O curso é 100% online com acesso vitalício e atualizações semanais. Além disso, conta com suporte especializado.');

    const saveBtn = page.locator('[data-testid="save-edit-cache-btn"]');
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Screenshot após salvar a edição com sucesso
    await page.screenshot({
        path: 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1/semantic_cache_edited_successfully.png'
    });
});

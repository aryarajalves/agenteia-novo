import { test, expect } from '@playwright/test';
import path from 'path';

test('Validação visual do Histórico de Leads com Mensagem de Template WhatsApp', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Interceptar a chamada de eventos para garantir o template e mensagens de contexto
    await page.route('**/webhooks/**/events**', async (route) => {
        const testEvents = [
            {
                id: 502,
                dono: 'usuario',
                event_type: 'message',
                message_type: 'text',
                mensagem: 'Olá, gostaria de saber se já posso acessar a plataforma.',
                agent_response: 'Olá! Sim, seu acesso foi liberado com sucesso!',
                cost: 0.05,
                created_at: '2026-09-16T08:15:20'
            },
            {
                id: 501,
                dono: 'agente',
                event_type: 'message_created',
                message_type: 'template',
                is_template: true,
                mensagem: null,
                agent_response: 'Olá! Seja muito bem-vindo(a) à Bússola Astrológica! 🧭✨ Aqui estão seus dados de acesso.',
                cost: 0.0,
                created_at: '2026-09-16T07:50:00'
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
            await page.waitForTimeout(2000);
        }
    }

    // 5. Validar que os badges e textos de template estão presentes
    const templateTrigger = page.locator('text=📋 Disparo Template WhatsApp');
    await expect(templateTrigger).toBeVisible({ timeout: 10000 });

    const templateBadge = page.locator('text=📋 TEMPLATE').first();
    await expect(templateBadge).toBeVisible();

    const templateText = page.locator('text=Bússola Astrológica');
    await expect(templateText).toBeVisible();

    // 6. Capturar Screenshot para evidência
    const screenshotPath = 'C:/Users/aryar/.gemini/antigravity/brain/7c9163f2-e8d5-46e1-959f-ad995eaf4186/screenshot_template_historico.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot salva com sucesso em:', screenshotPath);
});

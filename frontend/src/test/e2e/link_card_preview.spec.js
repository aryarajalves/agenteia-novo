import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E da renderização de cards de link dentro do chat', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });

  // 1. Mock de resposta com texto e link de checkout Kiwify
  await page.route('**/execute', async route => {
    const json = {
      response: "Formas de pagamento: Pix à vista por R$297 ou cartão de crédito parcelado em até 12x de R$30,72. Não aceitamos boleto.\n\nLink do curso:\nhttps://pay.kiwify.com.br/VVme7C2?utm_source=whatsapp&utm_medium-comerci",
      cost_usd: 0.0004,
      cost_brl: 0.0024,
      input_tokens: 15492,
      output_tokens: 3128,
      cached_tokens: 8704,
      model_used: "gpt-4o-mini",
      response_time_ms: 5861,
      error: false,
      timestamp: "2026-09-01T09:35:00.000Z",
      debug: {
        resolved_prompt: "Você é um assistente de teste."
      }
    };
    await route.fulfill({ json });
  });

  // 2. Login
  await page.goto('/login');
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await emailInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await emailInput.fill('aryarajmarketing@gmail.com');

  await passwordInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await passwordInput.fill('123456');
  
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');

  // 3. Acessar Playground
  await page.goto('/playground');
  await page.waitForTimeout(2000);

  // 4. Enviar mensagem
  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('Qual o link do curso?');
  await chatInput.press('Enter');

  // 5. Validar que a resposta e o card do link aparecem
  const linkBubble = page.locator('[data-testid="link-message-bubble"]').first();
  await expect(linkBubble).toBeVisible({ timeout: 15000 });

  await expect(page.locator('text=Checkout Oficial Kiwify')).toBeVisible();
  await expect(page.locator('.link-card-badge:has-text("Pagamento Seguro")')).toBeVisible();
  await expect(page.locator('text=Acessar ↗')).toBeVisible();

  await page.waitForTimeout(1000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 6. Capturar screenshot do chat com o link card
  await page.screenshot({
    path: path.join(artifactDir, 'link_preview_card_in_chat.png'),
    fullPage: false
  });

  // 7. Passar o mouse sobre o link card e capturar o estado de hover
  await linkBubble.hover();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(artifactDir, 'link_preview_card_hover.png'),
    fullPage: false
  });
});

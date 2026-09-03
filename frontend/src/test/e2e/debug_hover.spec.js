import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Diagnóstico de hover nas mensagens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // 1. Mock do endpoint de execução
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! Como posso te ajudar hoje?",
      cost_usd: 0.0001,
      cost_brl: 0.0006,
      input_tokens: 20,
      output_tokens: 15,
      cached_tokens: 0,
      model_used: "gpt-4o-mini",
      response_time_ms: 200,
      error: false,
      debug: { resolved_prompt: "Assistente de teste" }
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

  // 4. Enviar mensagem do usuário
  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('oie oie oie');
  await chatInput.press('Enter');

  const userBubble = page.locator('.user-row').first();
  await expect(userBubble).toBeVisible({ timeout: 10000 });

  const assistantBubble = page.locator('.assistant-row').first();
  await expect(assistantBubble).toBeVisible({ timeout: 10000 });

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';

  // Hover no user row
  await userBubble.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'hover_user_bubble.png') });

  // Hover no assistant row
  await assistantBubble.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'hover_assistant_bubble.png') });
});

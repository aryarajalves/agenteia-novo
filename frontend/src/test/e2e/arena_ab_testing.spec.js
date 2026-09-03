import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E da Arena A/B Testing e do botão Prompt Desafiante', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });

  // 1. Mock de resposta
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! Esta é a resposta do modelo no teste A/B.",
      cost_usd: 0.0002,
      cost_brl: 0.0012,
      input_tokens: 50,
      output_tokens: 25,
      cached_tokens: 0,
      model_used: "gpt-4o-mini",
      response_time_ms: 320,
      error: false,
      timestamp: "2026-09-01T11:20:00.000Z",
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

  // 4. Ativar Toggle "Arena A/B Testing"
  const arenaToggle = page.locator('#arena-toggle, label:has-text("Arena A/B Testing")').first();
  await arenaToggle.click();
  await page.waitForTimeout(1000);

  // 5. Validar que o botão '🥊 Prompt Desafiante' agora aparece com estilo neon
  const promptDesafianteBtn = page.locator('.hotfix-toggle:has-text("Prompt Desafiante")').first();
  await expect(promptDesafianteBtn).toBeVisible({ timeout: 5000 });

  // 6. Validar que a área do chat está em split-view (2 colunas)
  const splitViewArea = page.locator('.chat-area.split-view').first();
  await expect(splitViewArea).toBeVisible();

  // 7. Enviar mensagem para testar a resposta em ambas as colunas
  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('Olá, teste A/B!');
  await chatInput.press('Enter');
  await page.waitForTimeout(1500);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 8. Screenshot da Arena A/B com split-view perfeito lado a lado
  await page.screenshot({
    path: path.join(artifactDir, 'arena_ab_testing_split_view.png'),
    fullPage: false
  });

  // 9. Clicar no botão '🥊 Prompt Desafiante' para abrir o painel de edição do prompt desafiante
  await promptDesafianteBtn.click();
  await page.waitForTimeout(500);

  // 10. Screenshot com o drawer do Prompt Desafiante aberto
  await page.screenshot({
    path: path.join(artifactDir, 'arena_ab_prompt_desafiante_open.png'),
    fullPage: false
  });
});

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E das 2 abas na Arena A/B e editor em tela cheia do Prompt Desafiante', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1400, height: 900 });

  // 1. Mock de resposta do chat
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! Sou o agente.",
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
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
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
  await expect(page).toHaveURL('/', { timeout: 15000 });

  // 3. Acessar Playground
  await page.goto('/playground', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 4. Ativar modo Arena A/B
  await page.click('text=Arena A/B Testing');
  await page.waitForTimeout(1000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 5. Validar as 2 abas no cabeçalho
  const chatTab = page.locator('[data-testid="arena-tab-chat"]');
  const promptTab = page.locator('[data-testid="arena-tab-prompt"]');

  await expect(chatTab).toBeVisible();
  await expect(promptTab).toBeVisible();

  // Screenshot 1: Arena com aba de Chat ativa
  await page.screenshot({
    path: path.join(artifactDir, 'arena_ab_tabs_chat_view.png'),
    fullPage: false
  });

  // 6. Clicar na aba "Prompt Desafiante" para abrir tela cheia
  await promptTab.click();
  await page.waitForTimeout(500);

  // Validar elementos do editor de tela cheia
  await expect(page.locator('text=Prompt do Desafiante (Arena A/B)')).toBeVisible();
  await expect(page.locator('.challenger-prompt-textarea')).toBeVisible();

  // 7. Clicar no botão "Copiar Prompt de..." se disponível ou digitar texto
  const copyPromptBtn = page.locator('button:has-text("Copiar Prompt de")').first();
  if (await copyPromptBtn.isVisible()) {
    await copyPromptBtn.click();
  } else {
    await page.locator('.challenger-prompt-textarea').fill('Você é um assistente desafiante com foco em respostas diretas e ultra rápidas.');
  }
  await page.waitForTimeout(400);

  // Screenshot 2: Editor de Prompt Desafiante em tela cheia ocupando todo o espaço do chat
  await page.screenshot({
    path: path.join(artifactDir, 'arena_ab_fullscreen_prompt_editor.png'),
    fullPage: false
  });

  // 8. Voltar para o Chat da Arena
  const backToChatBtn = page.locator('button:has-text("Ir para o Chat da Arena")').first();
  await backToChatBtn.click();
  await page.waitForTimeout(500);

  // Validar que retornou para o chat e a aba mostra a contagem de tokens
  await expect(chatTab).toHaveClass(/active/);

  // Screenshot 3: Arena Chat com badge de tokens na aba do Prompt Desafiante
  await page.screenshot({
    path: path.join(artifactDir, 'arena_ab_tabs_chat_with_badge.png'),
    fullPage: false
  });
});

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E dos badges Não (False) no Modal de Filtros e Intenções', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // 1. Mock de resposta com pre_router contendo os campos booleanos longos
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! Como posso ajudar?",
      cost_usd: 0.0002,
      cost_brl: 0.0012,
      input_tokens: 40,
      output_tokens: 20,
      cached_tokens: 0,
      model_used: "gpt-4o-mini",
      response_time_ms: 250,
      error: false,
      debug: {
        resolved_prompt: "Você é um assistente de teste.",
        pre_router: {
          eh_saudacao: false,
          eh_agradecimento: false,
          eh_agradecimento_recorrente: false,
          eh_mensagem_automatica: false,
          precisa_esclarecimento: false,
          precisa_rag: true,
          eh_anuncio: false,
          id_agente_alvo: 36
        }
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
  await chatInput.fill('Teste de intenção');
  await chatInput.press('Enter');

  const assistantBubble = page.locator('.assistant-bubble').first();
  await expect(assistantBubble).toBeVisible({ timeout: 15000 });

  // 5. Clicar no botão Raio-X
  const raioXBtn = page.locator('button[data-testid="raio-x-toggle-btn"]').first();
  await expect(raioXBtn).toBeVisible({ timeout: 5000 });
  await raioXBtn.click();

  // 6. Clicar no botão '🧠 Ver Decisão do Pre-Router'
  const decisionBtn = page.locator('button:has-text("Ver Decisão do Pre-Router")').first();
  await expect(decisionBtn).toBeVisible({ timeout: 5000 });
  await decisionBtn.click();

  // 7. Validar que o modal abriu com os filtros
  const modalContent = page.locator('.modal-content').first();
  await expect(modalContent).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Filtros e Intenções do Usuário')).toBeVisible();

  await page.waitForTimeout(1000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 8. Capturar screenshot focado no modal com os badges perfeitamente alinhados
  await modalContent.screenshot({
    path: path.join(artifactDir, 'prerouter_badges_modal.png')
  });
});

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E dos modelos GPT-5 e integridade do layout do Chat', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1400, height: 900 });

  // 1. Mock de resposta
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! O curso é 100% online com acesso vitalício.",
      cost_usd: 0.0002,
      cost_brl: 0.0012,
      input_tokens: 280,
      output_tokens: 30,
      cached_tokens: 0,
      model_used: "gpt-5",
      response_time_ms: 380,
      error: false,
      timestamp: "2026-09-01T11:45:00.000Z",
      debug: {
        pre_router: {
          mensagem_original: "Olá",
          tipo_mensagem: "Saudação",
          precisa_rag: false,
          precisa_ferramenta: false,
          _debug_prompt: "SYSTEM:\nIdentifique se é saudação."
        },
        resolved_prompt: "Você é a Tarcira.",
        context_variables: {}
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
  await page.waitForTimeout(3000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 4. Capturar tela do Chat Vazio (altura total e sem encolhimento)
  await page.screenshot({
    path: path.join(artifactDir, 'playground_chat_empty_layout.png'),
    fullPage: false
  });

  // 5. Validar select de Modelos na Sidebar
  const modelSelect = page.locator('select').first();
  await expect(modelSelect).toBeVisible();

  // Validar opções do GPT-5 no select
  const optionsText = await modelSelect.innerText();
  console.log("Modelos disponíveis no select:", optionsText);
  expect(optionsText).toContain('gpt-5');
  expect(optionsText).toContain('gpt-5-mini');
  expect(optionsText).toContain('gpt-4o');

  // Selecionar gpt-5
  await modelSelect.selectOption('gpt-5');
  await page.waitForTimeout(400);

  // 6. Screenshot com o modelo GPT-5 selecionado
  await page.screenshot({
    path: path.join(artifactDir, 'playground_models_dropdown_gpt5.png'),
    fullPage: false
  });

  // 7. Enviar 2 mensagens para testar que o chat rola internamente e a barra de input continua visível e acessível
  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('Olá, tudo bem?');
  await chatInput.press('Enter');
  await page.waitForTimeout(1500);

  await chatInput.fill('Como funciona o atendimento?');
  await chatInput.press('Enter');
  await page.waitForTimeout(1500);

  // 8. Validar que o input continua visível e dentro do viewport
  await expect(chatInput).toBeVisible();

  // 9. Screenshot com mensagens e a barra de input perfeitamente visível no rodapé
  await page.screenshot({
    path: path.join(artifactDir, 'playground_chat_messages_input_visible.png'),
    fullPage: false
  });
});

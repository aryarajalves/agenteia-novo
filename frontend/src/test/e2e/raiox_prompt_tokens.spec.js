import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E da exibição de contagem de tokens nos Prompts do Raio-X', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 950 });

  // 1. Mock de resposta com debug de prompts
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! Como posso te ajudar hoje?",
      cost_usd: 0.0002,
      cost_brl: 0.0012,
      input_tokens: 350,
      output_tokens: 45,
      cached_tokens: 0,
      model_used: "gpt-4o-mini",
      response_time_ms: 450,
      error: false,
      timestamp: "2026-09-01T11:40:00.000Z",
      debug: {
        pre_router: {
          mensagem_original: "Olá",
          tipo_mensagem: "Saudação",
          precisa_rag: false,
          precisa_ferramenta: false,
          _debug_prompt: "SYSTEM:\nVocê é o Pre-Router AI. Identifique se a mensagem é apenas uma saudação."
        },
        resolved_prompt: "Você é a Tarcira, assistente virtual especialista no Método Laser Day.\nSeja sempre empática e profissional.\n\n### DIRETRIZES DE SEGURANÇA E ESTILO\nNunca fale mal de concorrentes e não dê descontos não autorizados.\n\n# CONTEXTO RAG:\nInformações do curso: O curso conta com 8 módulos completos e suporte individual.",
        context_variables: {
          cliente_nome: "Maria Silva",
          etapa_funil: "Atendimento Inicial"
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
  await chatInput.fill('Olá');
  await chatInput.press('Enter');
  await page.waitForTimeout(1500);

  // 5. Abrir Raio-X
  const raioxBtn = page.locator('button:has-text("Raio-X")').first();
  await raioxBtn.click();
  await page.waitForTimeout(500);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 6. Screenshot do Raio-X aberto com os botões e badges de tokens
  await page.screenshot({
    path: path.join(artifactDir, 'raiox_timeline_prompt_buttons.png'),
    fullPage: false
  });

  // 7. Clicar em "Visualizar Prompt Final do Sistema"
  const viewPromptBtn = page.locator('button:has-text("Visualizar Prompt Final do Sistema")').first();
  await viewPromptBtn.click();
  await page.waitForTimeout(600);

  // Validar badge no cabeçalho do modal e aba estática
  await expect(page.locator('[data-testid="modal-token-badge"]')).toBeVisible();
  await expect(page.locator('text=Prompt Estático (Instruções e Identidade)')).toBeVisible();

  // 8. Screenshot do Modal no Prompt Estático com token badges
  await page.screenshot({
    path: path.join(artifactDir, 'raiox_modal_prompt_estatico_tokens.png'),
    fullPage: false
  });

  // 9. Clicar na aba "Prompt Completo"
  const fullPromptTab = page.locator('button:has-text("Prompt Completo")').first();
  await fullPromptTab.click();
  await page.waitForTimeout(400);

  // 10. Screenshot do Prompt Completo com token badge
  await page.screenshot({
    path: path.join(artifactDir, 'raiox_modal_prompt_completo_tokens.png'),
    fullPage: false
  });

  // 11. Fechar modal
  await page.click('.close-btn-top-right, button:has-text("Fechar")');
  await page.waitForTimeout(400);

  // 12. Clicar em "Ver Prompt do Pre-Router"
  const preRouterPromptBtn = page.locator('button:has-text("Ver Prompt do Pre-Router")').first();
  await preRouterPromptBtn.click();
  await page.waitForTimeout(600);

  // 13. Screenshot do Prompt do Pre-Router com token badge
  await page.screenshot({
    path: path.join(artifactDir, 'raiox_modal_prerouter_prompt_tokens.png'),
    fullPage: false
  });
});

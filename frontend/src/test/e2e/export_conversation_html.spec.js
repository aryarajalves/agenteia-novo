import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E do Botão Exportar Conversa em Formato HTML com Perguntas e Respostas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // 1. Mock do endpoint de execução (/execute)
  await page.route('**/execute', async route => {
    const json = {
      response: "Olá! O curso Método Laser Day custa R$ 297 à vista ou 12x de R$ 30,72 no cartão. Inclui certificado oficial e suporte direto com a Tarcira.",
      cost_usd: 0.0003,
      cost_brl: 0.0018,
      input_tokens: 60,
      output_tokens: 35,
      cached_tokens: 0,
      model_used: "gpt-4o-mini",
      response_time_ms: 320,
      error: false,
      debug: {
        resolved_prompt: "Você é a assistente oficial da Tarcira Martins."
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
  
  await passwordInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  
  await emailInput.fill('aryarajmarketing@gmail.com');
  await passwordInput.fill('123456');
  
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  
  // 3. Acessar Playground
  await page.goto('/playground');
  await page.waitForTimeout(2000);

  // 4. Validar botão "📄 Exportar Conversa" no cabeçalho
  const exportBtn = page.locator('button[data-testid="export-training-btn"]');
  await expect(exportBtn).toBeVisible({ timeout: 5000 });
  await expect(exportBtn).toHaveText(/Exportar Conversa/i);

  // 5. Enviar primeira pergunta do usuário
  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('Qual o valor do curso e o que está incluso?');
  await chatInput.press('Enter');

  const assistantBubble = page.locator('.assistant-bubble').first();
  await expect(assistantBubble).toBeVisible({ timeout: 15000 });

  // 6. Clicar no botão e capturar o download do arquivo HTML
  const downloadPromise = page.waitForEvent('download');
  await exportBtn.click();
  const download = await downloadPromise;

  // Validar nome do arquivo e extensão .html
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/\.html$/i);
  expect(filename).toContain('conversa_');

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // Salvar o arquivo baixado
  const downloadedPath = path.join(artifactDir, filename);
  await download.saveAs(downloadedPath);
  expect(fs.existsSync(downloadedPath)).toBe(true);

  // Validar conteúdo do HTML exportado: Contém a pergunta do usuário e a resposta da IA!
  const fileContent = fs.readFileSync(downloadedPath, 'utf8');
  expect(fileContent).toContain('<!DOCTYPE html>');
  expect(fileContent).toContain('Qual o valor do curso e o que está incluso?');
  expect(fileContent).toContain('Olá! O curso Método Laser Day custa R$ 297 à vista');
  expect(fileContent).toContain('Usuário');

  // 7. Abrir o arquivo HTML baixado diretamente no navegador para tirar screenshot comprobatória
  const fileUrl = 'file:///' + downloadedPath.replace(/\\/g, '/');
  await page.goto(fileUrl);
  await page.waitForTimeout(1000);

  await page.screenshot({ 
    path: path.join(artifactDir, 'exported_conversation_html_page.png'),
    fullPage: true 
  });
});

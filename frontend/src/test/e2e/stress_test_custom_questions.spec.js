import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E do Roteiro de Perguntas Customizadas e Alinhamento do Toggle Switch', async ({ page }) => {
  // 1. Login
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
  
  // 2. Acessar Playground
  await page.goto('/playground');
  await page.waitForTimeout(2000);

  // 3. Ativar o Stress Test Toggle se necessário
  const stressToggle = page.locator('.tester-header-toggle');
  await expect(stressToggle).toBeVisible({ timeout: 5000 });

  const isTesterActive = await page.locator('.tester-config-box.active').count();
  if (isTesterActive === 0) {
    await stressToggle.click();
    await page.waitForTimeout(500);
  }

  const testerBox = page.locator('.tester-config-box');
  await testerBox.scrollIntoViewIfNeeded();

  // 4. Clicar no card de Roteiro de Perguntas Personalizadas
  const customScriptToggle = page.locator('.tester-toggle-card:has-text("Roteiro de Perguntas Personalizadas")');
  await expect(customScriptToggle).toBeVisible();
  await customScriptToggle.click();
  await page.waitForTimeout(500);

  // 5. Preencher 3 perguntas customizadas
  const textarea = page.locator('.custom-questions-textarea');
  await expect(textarea).toBeVisible();
  await textarea.fill('Qual o valor do curso completo?\nTem garantia de devolução do dinheiro?\nComo recebo os dados de acesso após o pagamento?');

  await page.waitForTimeout(500);

  // 6. Validar o badge com a contagem de perguntas
  const badge = page.locator('.question-count-badge');
  await expect(badge).toHaveText(/3 perguntas/i);

  const startBtn = page.locator('.start-tester-btn-modern');
  await expect(startBtn).toHaveText(/Enviar Roteiro \(3\)/i);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 7. Capturar screenshot focado no card com perguntas customizadas
  await testerBox.screenshot({
    path: path.join(artifactDir, 'stress_test_custom_questions_card.png')
  });

  // 8. Capturar screenshot completo da tela
  await page.screenshot({ 
    path: path.join(artifactDir, 'stress_test_custom_questions_full.png'),
    fullPage: true 
  });
});

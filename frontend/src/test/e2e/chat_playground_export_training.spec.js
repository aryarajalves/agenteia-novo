import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E do botão Exportar Treinamento no Chat Playground', async ({ page }) => {
  // 1. Acessar página de login
  await page.goto('/login');
  
  // 2. Limpar os campos antes de digitar (Regra acesso-sistema)
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await emailInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  
  await passwordInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  
  // 3. Preencher credenciais
  await emailInput.fill('aryarajmarketing@gmail.com');
  await passwordInput.fill('123456');
  
  // 4. Logar
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  
  // 5. Navegar para o Chat Playground
  await page.goto('/playground');
  await page.waitForTimeout(2000);

  // 6. Verificar se o botão de exportar para treinamento está visível
  const exportBtn = page.locator('[data-testid="export-training-btn"]');
  await expect(exportBtn).toBeVisible({ timeout: 5000 });
  await expect(exportBtn).toHaveText(/Exportar Treinamento/i);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 7. Capturar screenshot com o botão no topo do playground
  await page.screenshot({ 
    path: path.join(artifactDir, 'playground_export_training.png'),
    fullPage: true 
  });
});

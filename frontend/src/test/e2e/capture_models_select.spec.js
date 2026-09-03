import { test, expect } from '@playwright/test';
import path from 'path';

test('Captura do dropdown de modelos atualizado com GPT-5 e sem Gemini', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });

  // Login
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

  // Acessar Playground
  await page.goto('/playground', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Selecionar o dropdown de modelos principais
  const modelSelect = page.locator('.control-group select').first();
  await expect(modelSelect).toBeVisible();

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  
  // Screenshot do dropdown fechado com o valor
  await page.screenshot({
    path: path.join(artifactDir, 'playground_model_select_current.png'),
    fullPage: false
  });
});

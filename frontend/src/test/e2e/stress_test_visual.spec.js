import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação Visual do Redesign do Stress Test (Tester AI)', async ({ page }) => {
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

  // 3. Ativar o Stress Test Toggle se não estiver ativo
  const stressToggle = page.locator('.tester-header-toggle');
  await expect(stressToggle).toBeVisible({ timeout: 5000 });

  const isTesterActive = await page.locator('.tester-config-box.active').count();
  if (isTesterActive === 0) {
    await stressToggle.click();
    await page.waitForTimeout(500);
  }

  // 4. Validar visibilidade dos novos elementos modernos
  const testerBox = page.locator('.tester-config-box');
  await testerBox.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  await expect(page.locator('.tester-select')).toBeVisible();
  await expect(page.locator('.persona-desc-box')).toBeVisible();
  await expect(page.locator('.tester-params-grid')).toBeVisible();
  await expect(page.locator('.tester-toggles-list')).toBeVisible();
  await expect(page.locator('.start-tester-btn-modern')).toBeVisible();

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 5. Capturar screenshot focado no card do Stress Test
  await testerBox.screenshot({
    path: path.join(artifactDir, 'stress_test_card_focused.png')
  });

  // 6. Capturar screenshot da tela completa
  await page.screenshot({ 
    path: path.join(artifactDir, 'stress_test_redesign_after.png'),
    fullPage: true 
  });
});

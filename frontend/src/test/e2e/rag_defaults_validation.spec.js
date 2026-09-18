import { test, expect } from '@playwright/test';

test('Validação Visual dos Padrões RAG no Simulador (MULTIQUERY ativo, PARENTEXPANSION inativo)', async ({ page }) => {
  test.setTimeout(60000);
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
  await page.waitForTimeout(2000);

  // 2. Navegar para a base #36
  await page.goto('/knowledge-bases/36?view=content');
  await page.waitForTimeout(2000);

  // 3. Clicar na aba "🧪 Simulador RAG"
  const simTabBtn = page.locator('button:has-text("Simulador RAG")');
  await simTabBtn.waitFor({ timeout: 10000 });
  await simTabBtn.click();
  await page.waitForTimeout(1500);

  // 4. Validar checkboxes no Simulador
  const multiQuery = page.locator('label:has-text("MULTIQUERY") input[type="checkbox"]');
  const parentExpansion = page.locator('label:has-text("PARENTEXPANSION") input[type="checkbox"]');

  await multiQuery.waitFor({ timeout: 10000 });
  await expect(multiQuery).toBeChecked();
  await expect(parentExpansion).not.toBeChecked();

  // 5. Captura de tela da interface
  await page.screenshot({
    path: 'C:/Users/aryar/.gemini/antigravity/brain/dacec2dc-2d08-45c0-b955-010083db1759/screenshot_rag_defaults_simulador.png',
    fullPage: false
  });
});

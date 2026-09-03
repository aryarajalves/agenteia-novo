import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E do layout do cabeçalho do Chat Playground (Sem encolhimento)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });

  // 1. Login
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

  // 2. Acessar Playground
  await page.goto('/playground');
  await page.waitForTimeout(2000);

  const header = page.locator('.chat-premium-header').first();
  await expect(header).toBeVisible({ timeout: 10000 });

  const agentTitle = page.locator('.agent-meta-title h3').first();
  await expect(agentTitle).toBeVisible();

  const agentSubtitle = page.locator('.agent-meta-title p').first();
  await expect(agentSubtitle).toBeVisible();
  await expect(agentSubtitle).toHaveText('Assistente Virtual Nativo');

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 3. Capturar screenshot focado no header do chat
  await header.screenshot({
    path: path.join(artifactDir, 'chat_premium_header_clean.png')
  });

  // 4. Capturar screenshot geral da tela do playground
  await page.screenshot({
    path: path.join(artifactDir, 'playground_full_header.png'),
    fullPage: false
  });
});

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E da paginação no histórico de conversas (máx 20 por página)', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1400, height: 900 });

  // 1. Mock de 45 sessões de histórico
  await page.route('**/sessions?agent_id=*', async route => {
    const mockSessions = Array.from({ length: 45 }, (_, i) => ({
      session_id: `sess-${i + 1}`,
      agent_id: 1,
      agent_name: 'Agente - Tarcira',
      summary: `Conversa com cliente #${i + 1} sobre dúvidas do Método Laser Day`,
      total_cost: 0.15 + (i * 0.02),
      message_count: 6,
      last_interaction: '2026-09-01T10:30:00.000Z',
      is_test_session: i % 2 === 0
    }));
    await route.fulfill({ json: mockSessions });
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
  await page.waitForTimeout(2000);

  // 4. Clicar na aba History
  const historyTab = page.locator('button:has-text("History")').first();
  await historyTab.click();
  await page.waitForTimeout(1000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 5. Validar exibição da Página 1
  await expect(page.locator('text=Exibindo 1–20 de 45')).toBeVisible();
  await expect(page.locator('text=Pág. 1 / 3')).toBeVisible();
  
  const prevBtn = page.locator('[data-testid="history-page-prev"]');
  const nextBtn = page.locator('[data-testid="history-page-next"]');
  
  await expect(prevBtn).toBeDisabled();
  await expect(nextBtn).toBeEnabled();

  // Screenshot da Página 1 (20 itens)
  await page.screenshot({
    path: path.join(artifactDir, 'history_pagination_page_1.png'),
    fullPage: false
  });

  // 6. Clicar em Próxima para ir para a Página 2
  await nextBtn.click();
  await page.waitForTimeout(500);

  // Validar exibição da Página 2
  await expect(page.locator('text=Exibindo 21–40 de 45')).toBeVisible();
  await expect(page.locator('text=Pág. 2 / 3')).toBeVisible();
  await expect(prevBtn).toBeEnabled();
  await expect(nextBtn).toBeEnabled();

  // Screenshot da Página 2
  await page.screenshot({
    path: path.join(artifactDir, 'history_pagination_page_2.png'),
    fullPage: false
  });
});

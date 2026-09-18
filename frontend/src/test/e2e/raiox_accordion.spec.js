import { test, expect } from '@playwright/test';

test('Validação E2E do Acordeão de Raio-X no Chat Playground (fechar outros ao abrir um)', async ({ page }) => {
  test.setTimeout(120000);
  // 1. Acessar página de login
  await page.goto('/login');

  // 2. Limpar os campos antes de digitar
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  await passwordInput.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  // 3. Digitar credenciais
  await emailInput.fill('aryarajmarketing@gmail.com');
  await passwordInput.fill('123456');

  // 4. Submeter login
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await page.waitForTimeout(2000);

  // 5. Navegar até o playground com o agente real id=36
  await page.goto('/playground?agentId=36');
  await page.waitForTimeout(3000);

  // 6. Fechar o painel lateral para visualização limpa
  const toggleSidebarBtn = page.locator('.toggle-sidebar-btn');
  if (await toggleSidebarBtn.isVisible()) {
    await toggleSidebarBtn.click();
    await page.waitForTimeout(600);
  }

  const raioXButtons = page.locator('[data-testid="raio-x-toggle-btn"]');
  let count = await raioXButtons.count();

  const textarea = page.locator('.chat-input-premium');

  // Se precisar de mensagens para ter pelo menos 2 botões de Raio-X:
  while (count < 2) {
    await textarea.fill('Olá, tudo bem? Mensagem de teste ' + count);
    await page.click('.btn-send-modern');
    // Aguarda o próximo botão de Raio-X aparecer
    await raioXButtons.nth(count).waitFor({ timeout: 60000 });
    await page.waitForTimeout(2000);
    count = await raioXButtons.count();
  }

  expect(count).toBeGreaterThanOrEqual(2);

  // 7. Clicar no 1º botão de Raio-X
  await raioXButtons.nth(0).click();
  await page.waitForTimeout(1000);

  // Validar que o 1º está aberto e o 2º fechado
  await expect(raioXButtons.nth(0)).toHaveText(/Ocultar Detalhes/i);
  await expect(raioXButtons.nth(1)).toHaveText(/Raio-X/i);

  // Screenshot: 1º Raio-X aberto
  await page.screenshot({
    path: 'C:/Users/aryar/.gemini/antigravity/brain/dacec2dc-2d08-45c0-b955-010083db1759/screenshot_raiox_primeiro_aberto.png',
    fullPage: false
  });

  // 8. Clicar no 2º botão de Raio-X
  await raioXButtons.nth(1).click();
  await page.waitForTimeout(1000);

  // Validar que o 1º fechou automaticamente e o 2º abriu!
  await expect(raioXButtons.nth(0)).toHaveText(/Raio-X/i);
  await expect(raioXButtons.nth(1)).toHaveText(/Ocultar Detalhes/i);

  // Screenshot: 2º Raio-X aberto e 1º fechado (comportamento de acordeão comprovado)
  await page.screenshot({
    path: 'C:/Users/aryar/.gemini/antigravity/brain/dacec2dc-2d08-45c0-b955-010083db1759/screenshot_raiox_segundo_aberto.png',
    fullPage: false
  });
});

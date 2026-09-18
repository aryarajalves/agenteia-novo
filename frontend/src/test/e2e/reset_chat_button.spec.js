import { test, expect } from '@playwright/test';

test('Validação E2E do Botão Resetar Conversa e Modal de Confirmação no Chat Playground', async ({ page }) => {
  test.setTimeout(90000);
  // 1. Acessar página de login
  await page.goto('/login');

  // 2. Limpar os campos obrigatoriamente antes de digitar
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

  // 5. Navegar até o playground com agentId=1
  await page.goto('/playground?agentId=1');
  await page.waitForTimeout(3000);

  // 6. Fechar o painel lateral para ficar idêntico ao print do usuário
  const toggleSidebarBtn = page.locator('.toggle-sidebar-btn');
  if (await toggleSidebarBtn.isVisible()) {
    await toggleSidebarBtn.click();
    await page.waitForTimeout(600);
  }

  // 7. Validar presença do botão Resetar ao lado de Exportar
  const resetBtn = page.locator('[data-testid="reset-chat-header-btn"]');
  const exportBtn = page.locator('[data-testid="export-training-btn"]');

  await expect(resetBtn).toBeVisible();
  await expect(resetBtn).toHaveText(/Resetar/i);
  await expect(exportBtn).toBeVisible();

  // 8. Enviar uma mensagem de teste para preencher a conversa
  const textarea = page.locator('.chat-input-premium');
  await textarea.fill('Olá agente! Esta é uma mensagem de teste para validar o botão Resetar.');
  await page.click('.btn-send-modern');
  await page.waitForTimeout(2000);

  // Screenshot ANTES: Conversa ativa com botão Resetar visível no cabeçalho
  await page.screenshot({
    path: 'C:/Users/aryar/.gemini/antigravity/brain/dacec2dc-2d08-45c0-b955-010083db1759/screenshot_chat_antes_reset.png',
    fullPage: false
  });

  // 9. Clicar no botão Resetar para abrir o popup de confirmação
  await resetBtn.click();
  await page.waitForTimeout(500);

  // 10. Validar popup centralizado de confirmação
  const modalTitle = page.locator('text=Resetar Conversa');
  await expect(modalTitle).toBeVisible();

  // Screenshot MODAL: Popup de confirmação centralizado com backdrop
  await page.screenshot({
    path: 'C:/Users/aryar/.gemini/antigravity/brain/dacec2dc-2d08-45c0-b955-010083db1759/screenshot_chat_modal_reset.png',
    fullPage: false
  });

  // 11. Confirmar o reset clicando no botão "Resetar" do modal
  const confirmBtn = page.locator('.modal-btn.confirm');
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // 12. Validar toast de sucesso
  const toast = page.locator('.toast-notification');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveText(/Sessão resetada com sucesso!/i);

  // Screenshot DEPOIS: Conversa limpa com toast de confirmação
  await page.screenshot({
    path: 'C:/Users/aryar/.gemini/antigravity/brain/dacec2dc-2d08-45c0-b955-010083db1759/screenshot_chat_depois_reset.png',
    fullPage: false
  });
});

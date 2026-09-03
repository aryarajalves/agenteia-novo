import { test, expect } from '@playwright/test';

test('Inspecionar estilos do hover', async ({ page }) => {
  await page.route('**/execute', async route => {
    route.fulfill({ json: { response: "teste", cost_usd: 0, cost_brl: 0, input_tokens: 10, output_tokens: 10, error: false } });
  });

  await page.goto('/login');
  await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.goto('/playground');
  await page.waitForTimeout(1500);

  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('oie oie oie');
  await chatInput.press('Enter');

  const userRow = page.locator('.user-row').first();
  await expect(userRow).toBeVisible();

  await userRow.hover();
  await page.waitForTimeout(300);

  const debugInfo = await page.evaluate(() => {
    const row = document.querySelector('.user-row');
    const bubble = document.querySelector('.user-bubble');
    const avatar = document.querySelector('.user-avatar');
    
    // Obter todos os elementos dentro ou próximos ao row
    const elements = Array.from(row.querySelectorAll('*'));
    
    const getStyles = (el) => {
      const cs = window.getComputedStyle(el);
      const before = window.getComputedStyle(el, '::before');
      const after = window.getComputedStyle(el, '::after');
      return {
        tag: el.tagName,
        className: el.className,
        boxShadow: cs.boxShadow,
        border: cs.border,
        background: cs.background,
        outline: cs.outline,
        beforeContent: before.content,
        beforeBorder: before.border,
        afterContent: after.content,
        afterBorder: after.border,
        afterBg: after.background
      };
    };

    return {
      row: getStyles(row),
      bubble: getStyles(bubble),
      avatar: getStyles(avatar),
      children: elements.map(getStyles),
      rowHTML: row.outerHTML
    };
  });

  console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2));
});

import { test } from '@playwright/test';

test('Descobrir regras CSS exatas do hover', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.goto('/playground');
  await page.waitForTimeout(1000);

  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await chatInput.fill('oie oie oie');
  await chatInput.press('Enter');
  await page.waitForTimeout(1000);

  const cssRules = await page.evaluate(() => {
    const el = document.querySelector('.message-row.user-row');
    const matchedRules = [];
    
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.selectorText && el.matches(rule.selectorText.replace(/:hover/g, ''))) {
            matchedRules.push({
              selector: rule.selectorText,
              cssText: rule.cssText
            });
          }
        }
      } catch (e) {
        // Cross-origin stylesheet
      }
    }
    return matchedRules;
  });

  console.log('REGRAS CSS ENCONTRADAS:', JSON.stringify(cssRules, null, 2));
});

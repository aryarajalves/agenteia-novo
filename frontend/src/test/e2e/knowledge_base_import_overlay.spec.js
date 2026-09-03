import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E da tela de carregamento centralizada na importação de JSON de Perguntas e Respostas', async ({ page }) => {
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
  
  // 5. Navegar para a página de Centrais de Conhecimento
  await page.goto('/knowledge-bases');
  await page.waitForTimeout(2000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // Capturar tela da listagem de bases
  await page.screenshot({ 
    path: path.join(artifactDir, 'knowledge_bases_before_import.png'),
    fullPage: true 
  });

  // 6. Preparar arquivo JSON temporário com perguntas e respostas para importação
  const sampleKB = {
    name: "Base Teste Q&A Import",
    kb_type: "qa",
    description: "Base criada via teste de importação de JSON.",
    items: [
      {
        question: "Qual é o horário de atendimento?",
        answer: "Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.",
        category: "Geral",
        metadata: "horario"
      },
      {
        question: "Quais são as formas de pagamento?",
        answer: "Aceitamos PIX, cartão de crédito em até 12x e boleto bancário.",
        category: "Financeiro",
        metadata: "pagamento"
      }
    ]
  };

  const tempJsonPath = path.join(artifactDir, 'test_qa_import.json');
  fs.writeFileSync(tempJsonPath, JSON.stringify(sampleKB, null, 2));

  // Interceptar a rota de import para garantir que possamos capturar a tela de carregamento centralizada
  let routeFulfill;
  const delayedResponsePromise = new Promise((resolve) => {
    routeFulfill = resolve;
  });

  await page.route('**/knowledge-bases/import-new', async (route) => {
    // Aguarda um momento antes de responder para capturarmos o estado de loading
    await delayedResponsePromise;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 9999,
        name: "Base Teste Q&A Import",
        kb_type: "qa",
        description: "Base criada via teste de importação de JSON.",
        items: sampleKB.items
      })
    });
  });

  // 7. Disparar upload do JSON
  const fileInput = page.locator('input[type="file"][accept=".json"]');
  await fileInput.setInputFiles(tempJsonPath);

  // 8. Verificar que o overlay centralizado está visível
  const overlay = page.locator('[data-testid="import-loading-overlay"]');
  await expect(overlay).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Importando Base de Conhecimento...')).toBeVisible();

  // 9. Capturar screenshot com o overlay de carregamento no centro da tela
  await page.screenshot({ 
    path: path.join(artifactDir, 'knowledge_base_importing_overlay.png'),
    fullPage: true 
  });

  // 10. Liberar a resposta da rota
  routeFulfill();

  // 11. Aguardar conclusão e desaparecimento do overlay
  await expect(overlay).not.toBeVisible({ timeout: 10000 });

  // 12. Capturar screenshot final
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: path.join(artifactDir, 'knowledge_base_after_import.png'),
    fullPage: true 
  });
});

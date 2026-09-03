import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E da coluna de ID e filtragem por ID na Base de Conhecimento', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });

  // 1. Mock de Base de Conhecimento com itens reais para exibição perfeita
  await page.route('**/knowledge-bases/1', async route => {
    const json = {
      id: 1,
      name: "FAQ Tarcira Martins",
      description: "Base de conhecimento oficial do curso",
      kb_type: "qa",
      question_label: "Pergunta",
      answer_label: "Resposta",
      items: [
        {
          id: 1,
          question: "O certificado é reconhecido pelo MEC?",
          answer: "Olha, o curso oferece 2 tipos de certificado: 1) Certificado de conclusão de curso direto na área de membros, 2) Certificado reconhecido pelo MEC através de prova de proficiência.",
          category: "Certificado"
        },
        {
          id: 2,
          question: "Como funciona essa prova pra emitir o certificado reconhecido pelo MEC?",
          answer: "Para emissão do certificado do MEC, a prova de proficiência é online com perguntas relacionadas ao que você aprende ao longo do curso.",
          category: "Certificado"
        },
        {
          id: 3,
          question: "No curso tem certificado?",
          answer: "Tem sim! Assistindo todas as aulas, ao final do curso você recebe seu certificado de conclusão de curso que pode ser emitido direto na área de membros.",
          category: "Certificado"
        },
        {
          id: 4,
          question: "Quem é a professora do curso? Quem é a dona do curso?",
          answer: "A professora do curso é a Tarcira Martins, ela é empreendedora e trabalha na área da beleza há 17 anos.",
          category: "Professora"
        },
        {
          id: 5,
          question: "Quais são os procedimentos ensinados no curso?",
          answer: "No curso você aprende: remoção de tatuagem, remoção de micropigmentação, despigmentação, clareamento de manchas e laserterapia.",
          category: "Conteúdo"
        }
      ]
    };
    await route.fulfill({ json });
  });

  // 2. Login
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

  // 3. Acessar Base de Conhecimento 1 direto na visão de conteúdo
  await page.goto('/knowledge-bases/1?view=content');
  await page.waitForTimeout(1500);

  // 4. Clicar na aba "Itens da Base"
  const itemsTab = page.locator('button:has-text("Itens da Base"), .kb-manager-tab-btn:has-text("Itens da Base")').first();
  await expect(itemsTab).toBeVisible({ timeout: 5000 });
  await itemsTab.click();
  await page.waitForTimeout(1000);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 5. Validar que a coluna ID e os badges #1, #2, etc. estão visíveis
  await expect(page.locator('th:has-text("ID")')).toBeVisible();
  await expect(page.locator('.kb-id-badge:has-text("#1")').first()).toBeVisible();

  // 6. Capturar screenshot da tabela completa com coluna ID
  await page.screenshot({
    path: path.join(artifactDir, 'knowledge_base_ids_table.png'),
    fullPage: false
  });

  // 7. Filtrar por ID digitando '#4' no campo de busca
  const searchInput = page.locator('input[data-testid="kb-search-input"]').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill('#4');
  await page.waitForTimeout(600);

  // 8. Validar que apenas o item #4 está visível
  await expect(page.locator('.kb-id-badge:has-text("#4")')).toBeVisible();
  await expect(page.locator('text=Quem é a professora do curso?')).toBeVisible();
  await expect(page.locator('.kb-id-badge:has-text("#1")')).not.toBeVisible();

  // 9. Capturar screenshot com o filtro por ID aplicado
  await page.screenshot({
    path: path.join(artifactDir, 'knowledge_base_filtered_by_id.png'),
    fullPage: false
  });
});

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Validação E2E do Mapeamento de Fontes & Citações da Resposta da IA', async ({ page }) => {
  // 1. Mock do endpoint de execução (/execute)
  await page.route('**/execute', async route => {
    const json = {
      response: "Entendo sua preocupação. O curso é ministrado pela Tarcira Martins, que tem 17 anos de experiência, é parceira da Master Cosméticos e já formou mais de 2.000 alunas.\n\nSobre o valor: o investimento é R$297 à vista (Pix) ou parcelado em até 12x de R$30,72 no cartão.\n\nSe o preço for o que te preocupa, podemos oferecer um link com 20% de desconto. Posso te enviar esse link?",
      cost_usd: 0.0005,
      cost_brl: 0.003,
      input_tokens: 120,
      output_tokens: 85,
      cached_tokens: 0,
      model_used: "gpt-4o-mini",
      response_time_ms: 450,
      error: false,
      debug: {
        resolved_prompt: "Você é a assistente Tarcira. Responda com simpatia.",
        rag_items: [
          {
            id: 12,
            knowledge_base_id: 1,
            question: "Quem é a professora do curso?",
            answer: "Tarcira Martins, 17 anos de experiência, parceira Master Cosméticos.",
            category: "Sobre a Professora"
          }
        ]
      }
    };
    await route.fulfill({ json });
  });

  // 2. Mock do endpoint de atribuição de fontes (/attribute-sources)
  await page.route('**/attribute-sources', async route => {
    const json = {
      summary: 'A IA combinou 2 itens da Base de Conhecimento com 1 diretriz de desconto do Prompt de Sistema.',
      cost_usd: 0.0003,
      cost_brl: 0.0018,
      segments: [
        {
          segment_index: 1,
          text: 'Entendo sua preocupação. O curso é ministrado pela Tarcira Martins, que tem 17 anos de experiência, é parceira da Master Cosméticos e já formou mais de 2.000 alunas.',
          source_type: 'knowledge_base',
          source_title: 'Base de Conhecimento: Sobre a Professora e Metodologia',
          source_snippet: 'Perg: Quem é a professora do curso?\nResp: Tarcira Martins, 17 anos de experiência, parceira Master Cosméticos, mais de 2.000 alunas.',
          kb_id: 1,
          kb_item_id: 12,
          confidence: 0.98,
          explanation: 'Trecho extraído do item #12 da Base de Conhecimento.',
          link: {
            type: 'knowledge_base',
            url: '/knowledge-bases/1',
            label: 'Abrir Base de Conhecimento #1'
          }
        },
        {
          segment_index: 2,
          text: 'Sobre o valor: o investimento é R$297 à vista (Pix) ou parcelado em até 12x de R$30,72 no cartão.',
          source_type: 'knowledge_base',
          source_title: 'Base de Conhecimento: Valores e Formas de Pagamento',
          source_snippet: 'Perg: Qual o valor do curso?\nResp: O investimento é R$ 297 à vista no Pix ou 12x de R$ 30,72.',
          kb_id: 1,
          kb_item_id: 15,
          confidence: 0.95,
          explanation: 'Informações de precificação recuperadas via busca vetorial RAG.',
          link: {
            type: 'knowledge_base',
            url: '/knowledge-bases/1',
            label: 'Abrir Base de Conhecimento #1'
          }
        },
        {
          segment_index: 3,
          text: 'Se o preço for o que te preocupa, podemos oferecer um link com 20% de desconto. Posso te enviar esse link?',
          source_type: 'system_prompt',
          source_title: 'Prompt do Agente: Política de Descontos',
          source_snippet: '- POLÍTICA DE DESCONTOS: Caso o cliente hesite por conta do preço, ofereça 20% de desconto e pergunte se pode enviar o link.',
          agent_id: 1,
          confidence: 0.92,
          explanation: 'Diretriz de negociação e fechamento de vendas definida no Prompt de Sistema.',
          link: {
            type: 'agent_prompt',
            url: '/agent/1',
            label: 'Editar Prompt do Agente'
          }
        }
      ]
    };
    await route.fulfill({ json });
  });

  await page.setViewportSize({ width: 1280, height: 950 });

  // 3. Login
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
  
  // 4. Acessar Playground
  await page.goto('/playground');
  await page.waitForTimeout(2000);

  // 5. Enviar uma mensagem para gerar resposta no chat
  const chatInput = page.locator('textarea, input[placeholder*="Mensagem para o agente"]').first();
  await expect(chatInput).toBeVisible({ timeout: 5000 });
  await chatInput.fill('Qual o valor e quem é a professora?');
  await chatInput.press('Enter');

  // Aguardar a resposta do assistente
  const assistantBubble = page.locator('.assistant-bubble').first();
  await expect(assistantBubble).toBeVisible({ timeout: 15000 });

  // 6. Clicar no botão '🏷️ Origem das Informações'
  const attributionBtn = page.locator('button[data-testid="attribution-toggle-btn"]').first();
  await expect(attributionBtn).toBeVisible({ timeout: 5000 });
  await attributionBtn.click();

  // 7. Validar que o painel de atribuição abriu com os elementos
  const attributionPanel = page.locator('[data-testid="source-attribution-panel"]').first();
  await expect(attributionPanel).toBeVisible({ timeout: 5000 });

  await expect(page.locator('[data-testid="attribution-summary"]')).toBeVisible();
  await expect(page.locator('[data-testid="source-segment-0"]')).toBeVisible();
  await expect(page.locator('button:has-text("Abrir Base de Conhecimento #1")').first()).toBeVisible();
  await expect(page.locator('button:has-text("Editar Prompt do Agente")').first()).toBeVisible();

  await page.evaluate(() => {
    const el = document.querySelector('.messages-container') || document.querySelector('.chat-messages') || document.querySelector('.chat-area');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await attributionPanel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const artifactDir = 'C:/Users/aryar/.gemini/antigravity/brain/f92f818c-ea7e-4c98-a48a-e2446dbd05a1';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 8. Capturar screenshot focado no painel de atribuição
  await attributionPanel.screenshot({
    path: path.join(artifactDir, 'source_attribution_inspector.png')
  });

  // 9. Capturar screenshot de tela cheia
  await page.screenshot({ 
    path: path.join(artifactDir, 'source_attribution_full.png'),
    fullPage: true 
  });
});

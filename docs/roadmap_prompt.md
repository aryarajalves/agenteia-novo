# 🚀 Roadmap: Evolução da UI Agent Flow

Este documento detalha o plano de melhorias para a interface de gerenciamento de agentes, focando em organização, interatividade e inteligência.

---

## 🎨 Fase 1: Fundação Visual e Experiência IDE
**Objetivo:** Melhorar a navegação e a hierarquia visual para facilitar o trabalho com prompts complexos.

### Tarefas:
- [ ] **Layout Estilo IDE:** Implementar painéis laterais colapsáveis (como no VS Code) para maximizar a área de edição.
- [ ] **Breadcrumbs de Navegação:** Adicionar uma trilha no topo do editor (ex: `Agentes > Lira > Exemplo de Diálogos`) para contexto imediato.
- [ ] **Layers de Profundidade:** Aplicar tons de fundo diferentes para distinguir a árvore de estrutura do editor de texto.
- [ ] **Visual Grouping Dinâmico:** Adicionar linhas conectoras na árvore de estrutura para visualizar onde começam e terminam blocos `IF/ELSE`.
- [ ] **Estética Glassmorphism:** Atualizar containers com `backdrop-filter: blur()` e bordas sutis para um visual mais premium.

---

## 🎭 Fase 2: Simulação e Playground Interativo
**Objetivo:** Permitir que o usuário teste as mudanças no prompt em tempo real sem sair da tela.

### Tarefas:
- [ ] **Painel de Chat (Playground):** Adicionar uma janela de chat lateral integrada para testar o comportamento do agente.
- [ ] **Mock de Variáveis:** Criar um painel de "Contexto de Teste" onde o usuário define valores manuais para variáveis (ex: `is_vipv=true`) para validar condicionais.
- [ ] **Modo "Preview de Lógica":** Botão para destacar no editor apenas o texto que seria enviado à IA com base no contexto de teste atual.

---

## 🧠 Fase 3: Inteligência e Analytics de Tokens
**Objetivo:** Dar visibilidade sobre o custo e a qualidade das instruções escritas.

### Tarefas:
- [ ] **Heatmap de Tokens:** Barra visual no rodapé ou lateral mostrando qual seção da estrutura está consumindo mais tokens do prompt total.
- [ ] **AI Copilot (Otimizador):** Menu de contexto ao selecionar texto com opção "Otimizar Instrução" ou "Tornar mais conciso" via IA.
- [ ] **Autocomplete de Variáveis:** Sugestão inteligente ao digitar `{{` ou `$` com base nas variáveis disponíveis no sistema e banco de dados.
- [ ] **Health Check:** Indicador de "Saúde do Prompt" que alerta sobre instruções contraditórias ou excesso de ambiguidade.

---

## 📊 Fase 4: Visualização Avançada e Governança
**Objetivo:** Facilitar a gestão de fluxos lógicos complexos e o histórico de evolução.

### Tarefas:
- [ ] **Graph View (Canvas):** Botão para alternar a árvore de estrutura para uma visualização de fluxograma (nós e conexões).
- [ ] **Histórico de Snapshots:** Barra lateral com versões anteriores do prompt para comparação rápida.
- [ ] **Visual Diff View:** Interface lado a lado para ver exatamente o que mudou entre a versão atual e um snapshot anterior (verde/vermelho).
- [ ] **Exportação de Logs de Execução:** Ver exatamente como o prompt foi montado na última execução real do agente para depuração.

---

## 🛠️ Tecnologias Envolvidas
- **Frontend:** HTML5, CSS (Vanilla/Variables), JavaScript (ES6+).
- **Componentes sugeridos:** Lucide Icons (ícones), Monaco Editor ou Prism.js (syntax highlighting).
- **Backend:** Endpoints para salvar snapshots, calcular tokens (Tiktoken) e processar testes no Playground.

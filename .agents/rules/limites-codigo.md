---
trigger: always_on
---

# Regra de Limites de Código (Clean Code) e Backup Obrigatório

Para garantir que o projeto permaneça manutenível e que o agente consiga processar os arquivos sem perder o contexto, estabelecemos limites rígidos de tamanho de arquivo e um protocolo de segurança para modularizações.

**Limites Obrigatórios:**
1. **Backend (Python):**
   - **Limite Máximo Bloqueante:** Nenhum arquivo deve ultrapassar **1.000 linhas**.
   - **🚨 Sinal Vermelho (Alerta Máximo / Ficar de Olho):** Arquivos entre **870 e 999 linhas** entram automaticamente em Sinal Vermelho. É obrigatório monitorá-los ativamente e priorizar a modularização antes que qualquer nova funcionalidade os faça atingir 1.000 linhas.
2. **Frontend (React/JSX/JS/TS/CSS):**
   - **Limite Máximo Bloqueante:** Nenhum arquivo deve ultrapassar **500 linhas**. Os arquivos CSS também são estritamente considerados arquivos do frontend, portanto **devem ser modularizados** caso ultrapassem 500 linhas.
   - **🚨 Sinal Vermelho (Alerta Máximo / Ficar de Olho):** Arquivos entre **370 e 499 linhas** entram em Sinal Vermelho. Devem ser vigiados de perto a cada edição para evitar que estourem o teto de 500 linhas.

**Protocolo Obrigatório de Backup na Modularização:**
- **Cópia de Segurança Prévia:** Toda vez que você for fazer a modularização de um arquivo, o arquivo original que será modularizado **DEVE OBRIGATORIAMENTE** ter uma cópia de backup criada antes de qualquer alteração (ex: salvo na pasta `codigo_obsoleto/frontend/` ou `codigo_obsoleto/backend/` com extensão `.backup.*`).
- **Bloqueio no Git (.gitignore):** Esse arquivo de backup **PRECISA IR DIRETAMENTE PARA O `.gitignore`** para nunca ser enviado para o repositório ou para o ambiente de produção.
- **Finalidade do Backup:** O backup ficará salvo localmente como garantia e ponto de restauração imediato, caso a modularização apresente algum erro ou comportamento inesperado.

**Ações ao atingir o limite:**
- Se uma nova funcionalidade ou expansão de estilos for fazer um arquivo ultrapassar esses limites, você **DEVE** realizar a modularização (quebra do arquivo) antes de prosseguir com a implementação.
- Priorize a extração de componentes, hooks e submódulos CSS (frontend) e serviços/utilitários (backend) para arquivos ou pastas separadas.

**Isenção Obrigatória de Arquivos de Teste e Backups:**
- **Arquivos de Teste:** Arquivos de testes automatizados (pastas `tests/`, `src/test/`, arquivos com sufixo `.test.jsx`, `.test.js`, `.test.ts`, `.test.tsx`, ou prefixo `test_*.py`) **NÃO** entram na regra de refatoração por limite de código. As suítes de teste precisam cobrir múltiplos cenários e casos de borda sem serem quebradas artificialmente, portanto **NÃO devem ser refatoradas por tamanho nem listadas no Relatório Obrigatório Pós-Refatoração** como arquivos pendentes ou de Linha Vermelha.
- **Backups Legados:** Arquivos estáticos em `codigo_obsoleto/` ou com sufixo `_backup.py` / `*.backup.*` também são isentos.

**Relatório Obrigatório Pós-Refatoração:**
- Toda vez que você concluir a modularização/refatoração de um arquivo, você **DEVE OBRIGATORIAMENTE** listar na sua resposta final (filtrando apenas arquivos de produção, excluindo testes e backups):
  1. O arquivo refatorado com a contagem de linhas antes e depois da refatoração.
  2. A **lista dos arquivos que ainda faltam refatorar** (arquivos de produção que ainda ultrapassam o limite).
  3. A **lista atualizada dos arquivos que estão na Linha Vermelha / Sinal Vermelho** (Backend: 870 a 999 linhas | Frontend: 370 a 499 linhas) para indicar claramente o que precisa continuar sendo monitorado de perto.

Isso evita a criação de "Arquivos Monolíticos" que são difíceis de testar, manter e debugar.

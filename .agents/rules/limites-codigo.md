---
trigger: always_on
---

# Regra de Limites de Código (Clean Code) e Backup Obrigatório

Para garantir que o projeto permaneça manutenível e que o agente consiga processar os arquivos sem perder o contexto, estabelecemos limites rígidos de tamanho de arquivo e um protocolo de segurança para modularizações.

**Limites Obrigatórios:**
1. **Backend (Python):** Nenhum arquivo deve ultrapassar **1.000 linhas**.
2. **Frontend (React/JSX/JS/TS/CSS):** Nenhum arquivo deve ultrapassar **500 linhas**. Os arquivos CSS também são estritamente considerados arquivos do frontend, portanto **devem ser modularizados** caso ultrapassem 500 linhas.

**Protocolo Obrigatório de Backup na Modularização:**
- **Cópia de Segurança Prévia:** Toda vez que você for fazer a modularização de um arquivo, o arquivo original que será modularizado **DEVE OBRIGATORIAMENTE** ter uma cópia de backup criada antes de qualquer alteração (ex: salvo na pasta `codigo_obsoleto/frontend/` ou `codigo_obsoleto/backend/` com extensão `.backup.*`).
- **Bloqueio no Git (.gitignore):** Esse arquivo de backup **PRECISA IR DIRETAMENTE PARA O `.gitignore`** para nunca ser enviado para o repositório ou para o ambiente de produção.
- **Finalidade do Backup:** O backup ficará salvo localmente como garantia e ponto de restauração imediato, caso a modularização apresente algum erro ou comportamento inesperado.

**Ações ao atingir o limite:**
- Se uma nova funcionalidade ou expansão de estilos for fazer um arquivo ultrapassar esses limites, você **DEVE** realizar a modularização (quebra do arquivo) antes de prosseguir com a implementação.
- Priorize a extração de componentes, hooks e submódulos CSS (frontend) e serviços/utilitários (backend) para arquivos ou pastas separadas.

Isso evita a criação de "Arquivos Monolíticos" que são difíceis de testar, manter e debugar.

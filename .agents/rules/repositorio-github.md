---
trigger: always_on
---

# Repositório GitHub do Projeto

O repositório oficial do projeto é:

**URL:** https://github.com/aryarajalves/interface-agente-ia.git

**Protocolo Obrigatório:**
1. Todo `git push` deve ser direcionado para este repositório.
2. Nunca fazer push para outro remote sem autorização explícita do usuário.
3. **Nunca realizar um commit ou push sem antes perguntar explicitamente ao usuário se pode fazê-lo.**
4. O branch principal é o `main` — nunca fazer force push no `main`.
5. Toda mensagem de commit (título e corpo) deve obrigatoriamente estar em **português do Brasil**.
6. Toda mensagem de commit deve obrigatoriamente informar que o **Aryaraj** criou a funcionalidade (Ex: "Aryaraj criou a funcionalidade de [descrição]" ou "[Descrição] - Criado por Aryaraj").
7. **Proibição de `.env`:** É terminantemente proibido enviar (commitar/push) arquivos `.env` ou qualquer arquivo contendo credenciais reais para o repositório. O `.gitignore` deve ser sempre respeitado e caso tente fazer um push de um `.env` por acidente, a operação deve ser abortada. Apenas o `.env.example` pode ser commitado.
8. **Atualização do README.md:** Sempre que uma nova funcionalidade for adicionada, modificada ou uma grande atualização ocorrer, você DEVE obrigatoriamente atualizar o arquivo `README.md` na raiz do projeto com as novas informações, documentando o funcionamento e as atualizações para o usuário final.
9. **Auditoria Prévia de Vulnerabilidades em Dependências:** Antes de qualquer commit ou push para o GitHub, você DEVE obrigatoriamente executar a auditoria de segurança das dependências de terceiros no backend (`python scripts/audit_dependencies.py`) e no frontend (`npm run audit`). Caso sejam encontradas bibliotecas com vulnerabilidades conhecidas (especialmente de severidade Alta ou Crítica), elas devem ser corrigidas/atualizadas para versões seguras antes de enviar o código ao repositório.
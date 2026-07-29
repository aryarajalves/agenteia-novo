# Regras de Negócio - Sistema de Agentes Jaime

> 🛠️ **Nota Técnica:** A URL `https://backendagente.aryaraj.shop` é um túnel Cloudflare para o ambiente de desenvolvimento local. Trate-a como localhost.

## 📋 Status de Decisões

## 🌐 Conectividade e URLs
- **Redirecionamento Global:** Todas as URLs geradas pelo sistema (Webhooks, Widgets de Chat, Callbacks de OAuth) devem obrigatoriamente utilizar o endereço do túnel (Cloudflare) configurado em `BACKEND_URL` / `VITE_API_URL` em vez de `localhost`.
- **Sincronização de Ambiente:** As variáveis de ambiente `BACKEND_URL` e `VITE_API_URL` no arquivo `.env` devem ser mantidas em sincronia para garantir que o frontend e o backend falem a mesma "língua" pública.

- [ ] [NOVO] Como devemos tratar registros antigos na tabela `webhook_events` (Histórico de Disparos) que não possuem o campo `message_type`? Atualmente, eles exibem um ícone padrão de texto (📝). Devemos manter assim ou exibir um aviso de "Legado/Desconhecido"?

## 🔗 Slugs e Integrações
- **Formato e Limites:** Os slugs (tokens) de integração e memória são gerados automaticamente, mas podem ser editados pelo usuário. Não existe um limite de caracteres definido para esses campos.
- **Obrigatoriedade:** Slugs não podem ser deixados em branco durante a criação de uma integração.


## 👥 Gestão de Usuários
- [x] O sistema utiliza um fluxo de convites para novos usuários.
- [x] Administradores podem gerenciar permissões e agentes.

## 🤖 Agentes e Automação
- [x] Suporte a RAG via pgvector.
- [x] [NOVO] (14/07/2026) Edição de item de conhecimento (`PUT /knowledge-items/{id}`) deve recalcular o vetor (embedding)?
  - Resposta: Sim, sempre recalcular ao salvar edição, independente de qual campo mudou (antes só recalculava se a Pergunta mudasse). O vetor continua sendo gerado só a partir do campo "Pergunta" (arquitetura de busca RAG atual não embeda Resposta/Metadado) — se no futuro quiser que o vetor reflita também a Resposta, isso muda a relevância da busca em todas as bases e deve ser confirmado antes de implementar.
- [x] [NOVO] (14/07/2026) Descoberto que `get_embedding` (backend/services/rag/providers.py) engolia qualquer erro (chave da OpenAI ausente/inválida, falha de rede, quota, etc.) e retornava `None` silenciosamente — o item era criado/editado normalmente, só que sem vetor, sem nenhum aviso. Também não existe `backend/.env` neste projeto (só `.env.example`), que é a causa mais provável de itens sem vetor. O que fazer quando a geração do vetor falhar?
  - Resposta: Bloquear a criação/edição. Agora `get_embedding` levanta `EmbeddingGenerationError` em vez de devolver `None`, e os endpoints `POST /knowledge-bases/{kb_id}/items` e `PUT /knowledge-items/{id}` retornam 502 com mensagem clara e não salvam o item se o vetor não puder ser gerado. Pendente: verificar se `OPENAI_API_KEY` está de fato configurado no ambiente real (não encontrado neste projeto).
- [x] Integração com Google Calendar via OAuth.
- [x] Bug encontrado e corrigido (14/07/2026): a sincronização de etiquetas da ferramenta `transferir_suporte_humano` (`agent_core/tools/handlers/chatwoot.py`) nunca funcionou de verdade neste projeto — o código importava um módulo `chatwoot_utils` que jamais existiu aqui (resquício de uma versão anterior baseada em Chatwoot, antes da migração para ZapVoice) e usava variáveis de ambiente `CHATWOOT_URL`/`CHATWOOT_API_TOKEN` que também não existem. O `ImportError` era engolido por um `except Exception` genérico, então a automação sempre reportava "Etiquetas Adicionadas/Removidas" no pipeline sem nunca de fato chamar a API do ZapVoice. Corrigido para usar `zapvoice_utils.sync_conversation_labels` com `zapvoice_url`/`zapvoice_api_token` do `WebhookConfigModel`, igual ao resto do projeto. Confirmado via `git diff` que esse arquivo não foi alterado durante a remoção do painel "Suporte Humano" — o bug é anterior e não tem relação com aquela mudança. Testes `test_support_phone_mapping.py` e `test_transferir_suporte_humano.py` atualizados para refletir o ZapVoice em vez do Chatwoot legado.
  - Pendente de confirmação do usuário: no webhook em uso, o campo "Suporte Humano" → "Remover" e "Adicionar" (EditWebhookModal) está configurado com a MESMA etiqueta (`robo`) nos dois campos, o que é contraditório (adicionar e remover a mesma tag ao mesmo tempo). Isso é intencional ou é engano de configuração? Recomendo revisar essa tela.
- [x] [NOVO] O painel "Suporte Humano" (sidebar, página, endpoints `/support-requests`) deve ser removido — a ferramenta de IA `transferir_suporte_humano` deve continuar funcionando (cria o registro em `SupportRequestModel` e pausa a automação), mas sem nenhuma interface para marcar como resolvido/devolver ao robô pelo sistema?
  - Resposta (14/07/2026): Sim, remover tudo sem substituto — outro projeto do usuário cuida do suporte humano. Removidos: item da sidebar e rota `/support` (frontend), componentes `SupportDashboard` e `PublicSupportView` (movidos para `codigo_obsoleto/`, não apagados — usuário pediu para arquivar em vez de excluir), router `backend/api/routers/support.py` e seu `include_router` em `api/main.py` (movido para `codigo_obsoleto/backend/`), testes que cobriam só essas partes removidas (`test_support.py`, `test_support_resolve.py`, `test_support_ids.py`, `test_support_handoff_logic.py`, `verify_support_deletion.py`, também movidos). Mantidos intactos: `SupportRequestModel` (models.py), a ferramenta `transferir_suporte_humano`/`handle_chatwoot_handoff` (agent_core/tools/handlers/chatwoot.py) e seu registro em `database/seeds.py` — a IA continua transferindo e pausando a automação normalmente, só não há mais painel/endpoint para gerenciar a fila.
- [x] [NOVO] Como tratar emojis negativos (ex: 👎, 🖕, 😡, 😠, 🤬, 😕, 🙁, ☹️, 😢, 😭 e variações)?
  - Resposta: Devem ser interceptados programmaticamente em atalho direto no Pre-Router, respondendo de forma empática: "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?" sem passar pela LLM principal.
- [x] [NOVO] (29/07/2026) Se a ferramenta `registrar_duvida_sem_resposta` ("verificar com a equipe") for acionada mais de 1 vez na mesma conversa/sessão (total >= 2), o atendimento deve ser automaticamente transferido para o suporte humano (`transferir_suporte_humano`) para encerrar a automação do robô e notificar a equipe.
- [x] [NOVO] (14/07/2026) O prompt do Pre-Router (IA de triagem que decide saudação/ferramenta/RAG/roteamento antes do agente principal) era 100% hardcoded em `agent_core/logic/pre_router.py`, sem armazenamento em banco nem UI. O usuário pediu para poder ver e editar esse prompt na mesma tela do Editor de Prompt. Como isso deveria ser exposto, dado que o template tem um rodapé com schema JSON obrigatório (`chamada_ferramenta`, `precisa_rag`, etc.) que, se removido/quebrado pelo usuário, faria o Pre-Router parar de funcionar corretamente para aquele agente?
  - Resposta (decisão de implementação, sem bloquear no usuário por ser puramente técnica): Adicionada 3ª aba "🧭 Pre-Router" no Editor de Prompt (junto de Estático/Dinâmico), ligada à nova coluna `agent_config.pre_router_prompt` (nullable). Para minimizar o risco de o agente "quebrar" o Pre-Router: (1) o rodapé com o schema JSON de retorno (`PRE_ROUTER_JSON_FOOTER` em `pre_router.py`) NUNCA é customizável — é sempre concatenado por código após o texto do usuário, então a IA sempre retorna JSON estruturado válido independente do que for editado; (2) o texto customizável aceita os mesmos placeholders do template padrão (`{tools_desc}`, `{agents_desc}`, `{initial_msg}`, `{main_system_prompt}`, `{date_context}`, etc.) via `.format_map` com fallback seguro (chave ausente não quebra, mantém o texto literal); (3) um aviso visível foi adicionado na aba avisando para não remover `{tools_desc}`/`{agents_desc}`; (4) botão "Restaurar Padrão" busca `GET /agents/pre-router-default-prompt` para repopular com o template original a qualquer momento. Se o campo estiver vazio, o backend usa o `DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE` automaticamente (comportamento idêntico ao anterior, sem quebra para agentes existentes).
  - **Aviso de infraestrutura (regra `integridade-banco.md`):** a coluna `pre_router_prompt` só é criada automaticamente em bancos novos (via `create_all`). Se este projeto já roda em produção com banco existente, rodar `alembic upgrade head` (a migration `e3f4a5b6c7d8` já existia órfã na cadeia, só faltava o mapeamento em `models.py`) ou aplicar a coluna manualmente.

## 📝 Perguntas e Decisões Pendentes
- [x] [NOVO] Existe algum ambiente onde o uso de `localhost:8002` ainda seja obrigatório para o frontend em vez do túnel?
  - Resposta: No ambiente de desenvolvimento local, o frontend acessa o backend via `localhost:8002`. O erro de agentes sumindo foi causado por um mismatch (estava 8000 no config.js).
- [ ] [NOVO] As rotas `/agents/{id}/generate-description` e `/agents/{id}/duplicate` foram removidas ou ainda precisam ser implementadas? Elas constam nos testes e em partes do frontend, mas não estão no backend atual (causando 404).
- [x] [NOVO] Se o áudio/imagem for permitido nas configurações, a automação deve realmente PARAR e apenas avisar o tipo, ou ela deveria tentar processar (ex: transcrever áudio ou descrever imagem) no futuro?
  - Resposta: No futuro deve processar (baixar e transcrever), mas por enquanto deve apenas parar e identificar o tipo.
- [x] [NOVO] Quando uma mídia for bloqueada (ex: vídeo ou documento), devemos enviar uma mensagem automática ao cliente final avisando que o formato não é aceito, ou apenas registrar isso no log interno da pipeline?
  - Resposta: Apenas registrar no log interno da pipeline, não enviar nada ao cliente final.
- [x] Qual deve ser o tempo padrão de expiração do Toast (atualmente 3 segundos)?
  - Resposta: 5 segundos.
- [x] Deseja que ao expandir um contato, todos os outros se fechem automaticamente (comportamento de Accordion)?
  - Resposta: Sim, deve fechar os outros ao abrir um novo.
- [ ] [NOVO] Deseja que a automação de retorno ao robô envie um log específico para o painel de histórico do agente informando que a IA reassumiu o controle?
- [ ] [NOVO] Quem é o 'Mateus' mencionado nos testes? Ele é um membro da equipe de suporte, um vendedor ou outra função? Precisamos dessa informação para alimentar a base de conhecimento do agente e evitar alucinações.
- [x] [NOVO] Ao qualificar um lead, deseja que a etiqueta específica configurada no agente (qualification_labels) seja gravada na coluna 'labels' da tabela local de leads (banco do ZapVoice), em vez de gravar apenas o valor estático 'qualificado'?
  - Resposta: Sim, o contato deve ser criado ou atualizado no banco do ZapVoice (tabela local de leads) com as etiquetas de qualificação configuradas no agente.



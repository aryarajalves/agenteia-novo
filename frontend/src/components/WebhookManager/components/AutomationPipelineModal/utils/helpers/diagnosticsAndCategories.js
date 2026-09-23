/**
 * Analisador semântico de erros para fornecer diagnóstico e dicas acionáveis de resolução.
 */
export function getSmartDiagnostic(content, title = '') {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('connection refused') || text.includes('errno 111') || text.includes('econnrefused')) {
        return {
            type: 'connection_refused',
            title: 'Recusa de Conexão (Serviço Inacessível)',
            tip: 'O serviço de destino (ZapVoice/WhatsApp) recusou a conexão. Se estiver rodando localmente no Docker, configure a URL como "http://host.docker.internal:8000" em vez de "localhost".',
            severity: 'error',
            action: 'Verificar URL da Integração'
        };
    }

    if (text.includes('401') || text.includes('unauthorized') || text.includes('invalid api key') || text.includes('chave inválida') || text.includes('incorrect api key')) {
        return {
            type: 'auth_error',
            title: 'Falha de Autenticação / Token Inválido',
            tip: 'A chave de API ou token de autorização fornecido é inválido ou expirou. Verifique as credenciais no arquivo .env ou no modal de configuração da integração.',
            severity: 'error',
            action: 'Revisar Credenciais'
        };
    }

    if (text.includes('429') || text.includes('insufficient_quota') || text.includes('rate_limit') || text.includes('quota exceeded') || text.includes('exceeded your current quota')) {
        return {
            type: 'quota_error',
            title: 'Cota de IA Esgotada ou Limite de Taxa',
            tip: 'O saldo de créditos do provedor de IA terminou ou o limite de requisições simultâneas por minuto foi atingido. Verifique o saldo no painel da OpenAI/Anthropic.',
            severity: 'warning',
            action: 'Checar Saldo do Provedor'
        };
    }

    if (text.includes('timeout') || text.includes('timed out') || text.includes('timed-out') || text.includes('60s timeout')) {
        return {
            type: 'timeout_error',
            title: 'Tempo Limite Excedido (Timeout)',
            tip: 'A conexão demorou mais tempo que o permitido para responder. O servidor de destino pode estar em sobrecarga temporária ou enfrentando lentidão.',
            severity: 'warning',
            action: 'Testar Conectividade'
        };
    }

    if (text.includes('404') || text.includes('not found')) {
        return {
            type: 'not_found',
            title: 'Recurso ou Rota Não Encontrada (404)',
            tip: 'A URL do webhook ou endpoint acessado não existe no servidor de destino. Verifique os caminhos configurados.',
            severity: 'error',
            action: 'Revisar Rota'
        };
    }

    return null;
}

/**
 * Classifica o passo em uma categoria para filtros da timeline baseando-se estritamente no TÍTULO da etapa.
 */
export function getStepCategory(step) {
    const title = (step.step || step.title || '').toLowerCase();
    
    // 1. Verificação estrita de erros no título da etapa
    if (
        title.includes('❌') || 
        title.includes('🛑') || 
        title.includes('falha') || 
        title.includes('erro') || 
        title.includes('interrompido') || 
        title.includes('cancelad')
    ) {
        return 'errors';
    }
    
    // 2. Etapas de IA e Decisão
    if (
        title.includes('🧠') || 
        title.includes('🤖') || 
        title.includes('⚡') || 
        title.includes('pre-router') || 
        title.includes('agente') || 
        title.includes('rag') || 
        title.includes('saudação') || 
        title.includes('raio-x') || 
        title.includes('intenção') || 
        title.includes('resposta') || 
        title.includes('decisão') ||
        title.includes('anúncio') ||
        title.includes('memória') ||
        title.includes('contexto') ||
        title.includes('conectando') ||
        title.includes('mensagem enviada')
    ) {
        return 'ai';
    }
    
    // 3. Etapas de Ferramentas, Mídias, Leads e Dados
    if (
        title.includes('🛠️') || 
        title.includes('ferramenta') || 
        title.includes('variáveis') || 
        title.includes('💾') || 
        title.includes('🏷️') || 
        title.includes('lead') || 
        title.includes('etiqueta') || 
        title.includes('zapvoice') || 
        title.includes('mídia') || 
        title.includes('áudio') || 
        title.includes('imagem') || 
        title.includes('debounce') || 
        title.includes('💰') || 
        title.includes('financeiro') ||
        title.includes('status') ||
        title.includes('contato')
    ) {
        return 'tools';
    }

    return 'ai';
}

import { useState } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../../WebhookManager/utils/helpers';

export const usePromptAdvisor = ({ agentId, mainModel, value, onChange, setSearchResults }) => {
    const [advisorMessages, setAdvisorMessages] = useState([
        { role: 'assistant', content: 'Olá! Sou seu **Consultor de Prompt**. \n\nPosso analisar a estrutura das suas instruções, sugerir melhorias estratégicas ou ajudar você a localizar e atualizar regras específicas. Como posso ajudar?' }
    ]);
    const [advisorInput, setAdvisorInput] = useState('');
    const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
    const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
    const [showAdvisorChat, setShowAdvisorChat] = useState(false);

    const handleAdvisorMessage = async (message, imageUrl = null) => {
        setIsAdvisorLoading(true);
        const newMessages = [...advisorMessages, { role: 'user', content: message, imageUrl: imageUrl }];
        setAdvisorMessages(newMessages);

        try {
            const response = await api.post('/prompt-chat', {
                agent_id: agentId,
                model: mainModel,
                current_prompt: value,
                messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                image_url: imageUrl
            });
            const data = await response.json();
            setAdvisorMessages([...newMessages, { 
                role: 'assistant', 
                content: data.content,
                model: data.model,
                usage: data.usage
            }]);
        } catch (error) {
            console.error('Advisor Error:', error);
            setAdvisorMessages([...newMessages, { role: 'assistant', content: '❌ Erro ao conectar com o assistente. Verifique se o servidor está online.' }]);
        } finally {
            setIsAdvisorLoading(false);
        }
    };

    const handleApplySuggestions = async () => {
        setIsAdvisorLoading(true);
        setIsApplyingSuggestion(true);
        try {
            const response = await api.post('/apply-suggestions', {
                agent_id: agentId,
                model: mainModel,
                current_prompt: value,
                messages: advisorMessages.filter(m => m.role !== 'system')
            });
            const data = await response.json();
            if (data.prompt) {
                onChange({ target: { value: data.prompt } });
                setAdvisorMessages([...advisorMessages, { role: 'assistant', content: '✅ Prompt atualizado com sucesso!' }]);
            }
        } catch (error) {
            console.error('Apply Error:', error);
        } finally {
            setIsAdvisorLoading(false);
            setIsApplyingSuggestion(false);
        }
    };

    const handleAdvisorSearch = async (query) => {
        setIsAdvisorLoading(true);
        try {
            const response = await api.post('/search-prompt', {
                agent_id: agentId,
                system_prompt: value,
                query: query
            });
            const data = await response.json();
            
            if (data.found && data.occurrences.length > 0) {
                const results = data.occurrences.map(occ => ({
                    line: occ.line_start,
                    text: occ.text_snippet,
                    explanation: occ.explanation
                }));
                if (setSearchResults) setSearchResults(results);
                setAdvisorMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `🔍 Encontrei ${results.length} ocorrência(s) sobre "${data.corrected_query || query}":\n\n` + 
                             results.map(r => `• **Linha ${r.line}**: ${r.explanation}`).join('\n')
                }]);
            } else {
                setAdvisorMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `❌ Não encontrei informações específicas sobre "${query}" no prompt atual.` 
                }]);
            }
        } finally {
            setIsAdvisorLoading(false);
        }
    };

    const handlePublishPrompt = async () => {
        setIsAdvisorLoading(true);
        try {
            await api.patch(`/agents/${agentId}/publish`, {
                prompt: value
            });
            showToast("Prompt publicado com sucesso!");
            setAdvisorMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `🚀 **Sucesso!**\n\nAs alterações foram publicadas permanentemente no agente. Seu assistente já está utilizando a nova versão.` 
            }]);
        } catch (error) {
            console.error('Publish Error:', error);
            setAdvisorMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao publicar alterações. Tente novamente mais tarde.' }]);
        } finally {
            setIsAdvisorLoading(false);
        }
    };

    const handleResetAdvisorMemory = () => {
        setAdvisorMessages([
            { role: 'assistant', content: 'Olá! Sou seu **Consultor de Prompt**. \n\nPosso analisar a estrutura das suas instruções, sugerir melhorias estratégicas ou ajudar você a localizar e atualizar regras específicas. Como posso ajudar?' }
        ]);
        showToast("Memória do assistente reiniciada.");
    };

    return {
        advisorMessages,
        setAdvisorMessages,
        advisorInput,
        setAdvisorInput,
        isAdvisorLoading,
        setIsAdvisorLoading,
        isApplyingSuggestion,
        setIsApplyingSuggestion,
        showAdvisorChat,
        setShowAdvisorChat,
        handleAdvisorMessage,
        handleApplySuggestions,
        handleAdvisorSearch,
        handlePublishPrompt,
        handleResetAdvisorMemory
    };
};

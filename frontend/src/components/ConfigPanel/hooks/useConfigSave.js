import { api } from '../../../api/client';
import { useConfig } from '../ConfigContext';

export const useConfigSave = () => {
    const {
        id, isNew, navigate,
        setIsSaving, setStatus, setValidationErrors,
        name, description, selectedModel, fallbackModel,
        temperature, topP, topK, presencePenalty, frequencyPenalty,
        safetySettings, reasoningEffort, dateAwareness,
        dateAwarenessPastDays, dateAwarenessFutureDays,
        simulatedTime,
        systemPrompt, dynamicPrompt, preRouterPrompt, contextWindow, knowledgeBaseIds, selectedTools,
        toolPrompts,
        ragRetrievalCount, ragTranslationEnabled, ragMultiQueryEnabled,
        ragRerankEnabled, ragAgenticEvalEnabled, ragParentExpansionEnabled,
        ragRelevanceThreshold,
        ragKbRoutingEnabled, ragKbRoutingVariable,
        semanticCacheEnabled,
        semanticCacheThreshold,
        inboxCaptureEnabled, initialMessage, initialQuestionMessage,
        initialIgnoreMessage, qualificationQuestions, qualificationLabels, qualificationCriteria, qualificationFinalAction, qualificationFinalActionTrigger,
        qualificationFunnels, setQualificationFunnels, activeFunnelId,
        securityBlacklist, securityForbidden,
        securityDiscount, securityComplexity, securityPii,
        securityValidatorIa, securityBotProtection, securityMaxMessages,
        securitySemanticThreshold, securityLoopCount, routerEnabled,
        routerSimpleModel, routerSimpleFallbackModel, routerComplexModel,
        handoffEnabled, unansweredHandoffEnabled, unansweredHandoffLimit, unansweredQuestionPrompt, responseTranslationEnabled,
        responseTranslationFallbackLang, uiPrimaryColor, uiHeaderColor,
        uiChatTitle, uiWelcomeMessage, modelSettings, configRole,
        greetingMode, questionMode, adMode
    } = useConfig();

    const handleSave = async () => {
        const errors = [];
        if (!name.trim()) errors.push('nome');
        const needsModel = !routerEnabled;
        const hasMainModel = needsModel ? !!selectedModel : (!!routerSimpleModel && !!routerComplexModel);
        if (!hasMainModel) errors.push('modelo');
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        setValidationErrors([]);

        try {
            setIsSaving(true);
            setStatus('Iniciando salvamento...');

            // Sincronizar dados do funil ativo com a lista de múltiplos funis
            let updatedFunnels = [...(qualificationFunnels || [])];
            const activeIdx = updatedFunnels.findIndex(f => f.id === activeFunnelId);
            const activeFunnelData = {
                questions: qualificationQuestions || [],
                labels: qualificationLabels || [],
                criteria: qualificationCriteria || '',
                final_action: qualificationFinalAction || '',
                final_action_trigger: qualificationFinalActionTrigger || 'all'
            };

            if (activeIdx >= 0) {
                updatedFunnels[activeIdx] = {
                    ...updatedFunnels[activeIdx],
                    ...activeFunnelData
                };
            } else if (updatedFunnels.length === 0) {
                updatedFunnels = [{
                    id: 'funnel_default',
                    name: 'Padrão / Principal',
                    is_default: true,
                    ...activeFunnelData
                }];
            }

            const defaultFunnel = updatedFunnels.find(f => f.is_default) || updatedFunnels[0] || {};

            const payload = {
                name,
                description,
                model: routerEnabled ? (routerComplexModel || selectedModel) : selectedModel,
                fallback_model: fallbackModel || null,
                temperature: parseFloat(temperature) || 1.0,
                top_p: parseFloat(topP) || 1.0,
                date_awareness: !!dateAwareness,
                date_awareness_past_days: parseInt(dateAwarenessPastDays) ?? 7,
                date_awareness_future_days: parseInt(dateAwarenessFutureDays) ?? 7,
                system_prompt: systemPrompt || "",
                dynamic_prompt: dynamicPrompt || "",
                pre_router_prompt: preRouterPrompt || "",
                context_window: parseInt(contextWindow) || 5,
                knowledge_base_ids: Array.isArray(knowledgeBaseIds) ? knowledgeBaseIds.map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
                rag_retrieval_count: parseInt(ragRetrievalCount) || 5,
                rag_translation_enabled: !!ragTranslationEnabled,
                rag_multi_query_enabled: !!ragMultiQueryEnabled,
                rag_rerank_enabled: !!ragRerankEnabled,
                rag_agentic_eval_enabled: !!ragAgenticEvalEnabled,
                rag_parent_expansion_enabled: !!ragParentExpansionEnabled,
                rag_relevance_threshold: (parseFloat(ragRelevanceThreshold) || 0) / 100,
                rag_kb_routing_enabled: !!ragKbRoutingEnabled,
                rag_kb_routing_variable: ragKbRoutingVariable || null,
                semantic_cache_enabled: !!semanticCacheEnabled,
                semantic_cache_threshold: (parseFloat(semanticCacheThreshold) || 92) / 100,
                inbox_capture_enabled: !!inboxCaptureEnabled,
                tool_ids: Array.isArray(selectedTools) ? selectedTools.map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
                tool_prompts: toolPrompts || {},
                simulated_time: dateAwareness ? (simulatedTime || null) : null,
                security_competitor_blacklist: securityBlacklist || null,
                security_forbidden_topics: securityForbidden || null,
                security_discount_policy: securityDiscount || null,
                security_language_complexity: securityComplexity || 'standard',
                security_pii_filter: !!securityPii,
                security_validator_ia: !!securityValidatorIa,
                security_bot_protection: !!securityBotProtection,
                security_max_messages_per_session: parseInt(securityMaxMessages) || 20,
                security_semantic_threshold: parseFloat(securitySemanticThreshold) || 0.85,
                security_loop_count: parseInt(securityLoopCount) || 3,
                ui_primary_color: uiPrimaryColor || '#6366f1',
                ui_header_color: uiHeaderColor || '#0f172a',
                ui_chat_title: uiChatTitle || 'Suporte Inteligente',
                ui_welcome_message: uiWelcomeMessage || 'Olá! Como posso te ajudar hoje?',
                initial_message: initialMessage || null,
                initial_question_message: initialQuestionMessage || null,
                greeting_mode: greetingMode || 'prompt',
                question_mode: questionMode || 'panel',
                ad_mode: adMode || 'panel',
                initial_ignore_message: initialIgnoreMessage.length > 0 ? JSON.stringify(initialIgnoreMessage) : null,
                qualification_funnels: updatedFunnels,
                qualification_questions: (defaultFunnel.questions && defaultFunnel.questions.length > 0) ? JSON.stringify(defaultFunnel.questions) : null,
                qualification_labels: (defaultFunnel.labels && defaultFunnel.labels.length > 0) ? JSON.stringify(defaultFunnel.labels) : null,
                qualification_criteria: defaultFunnel.criteria || null,
                qualification_final_action: defaultFunnel.final_action || null,
                qualification_final_action_trigger: defaultFunnel.final_action_trigger || 'all',
                unanswered_handoff_limit: unansweredHandoffEnabled ? (parseInt(unansweredHandoffLimit) || 2) : 0,
                unanswered_question_prompt: unansweredQuestionPrompt ? unansweredQuestionPrompt.trim() : null,
                router_enabled: true,
                router_simple_model: routerSimpleModel,
                router_simple_fallback_model: routerSimpleFallbackModel || null,
                router_complex_model: routerComplexModel,
                handoff_enabled: !!handoffEnabled,
                response_translation_enabled: !!responseTranslationEnabled,
                response_translation_fallback_lang: responseTranslationFallbackLang || 'portuguese',
                top_k: parseInt(topK) || 40,
                presence_penalty: parseFloat(presencePenalty) || 0.0,
                frequency_penalty: parseFloat(frequencyPenalty) || 0.0,
                safety_settings: safetySettings || 'standard',
                reasoning_effort: reasoningEffort || 'medium',
                model_settings: {
                    ...(modelSettings || {}),
                    [(configRole || 'main')]: {
                        temperature: parseFloat(temperature) || 1.0,
                        top_p: parseFloat(topP) || 1.0,
                        top_k: parseInt(topK) || 40,
                        presence_penalty: parseFloat(presencePenalty) || 0.0,
                        frequency_penalty: parseFloat(frequencyPenalty) || 0.0,
                        safety_settings: safetySettings || 'standard',
                        context_window: parseInt(contextWindow) || 5,
                        reasoning_effort: reasoningEffort || 'medium'
                    }
                }
            };

            const res = isNew
                ? await api.post('/agents', payload)
                : await api.put(`/agents/${id}`, payload);

            setQualificationFunnels(updatedFunnels);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
                throw new Error(Array.isArray(errorData.detail)
                    ? errorData.detail.map(e => e.msg).join(', ')
                    : errorData.detail || "Erro ao salvar agente");
            }

            setStatus('Sucesso! Redirecionando...');
            setIsSaving(false);
            setTimeout(() => {
                setStatus('');
                navigate('/');
            }, 1000);

        } catch (err) {
            console.error("❌ Erro fatal ao salvar:", err);
            setStatus(`Erro: ${err?.message || err}`);
            setIsSaving(false);
        }
    };

    return { handleSave };
};

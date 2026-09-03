import { useEffect } from 'react';
import { api } from '../../../api/client';
import { useConfig } from '../ConfigContext';

export const useConfigData = () => {
    const {
        id, isNew,
        setModels, setKbList, setToolsList, setGoogleConnected,
        setOpenaiConnected, setGeminiConnected, setAnthropicConnected,
        setIsLoadingData, setStatus,
        setName, setDescription, setSelectedModel, setFallbackModel,
        setTemperature, setTopP, setTopK, setPresencePenalty, setFrequencyPenalty,
        setSafetySettings, setReasoningEffort, setDateAwareness,
        setDateAwarenessPastDays, setDateAwarenessFutureDays,
        setSimulatedTime,
        setSystemPrompt, setDynamicPrompt, setPreRouterPrompt, setContextWindow, setKnowledgeBaseIds, setSelectedTools,
        setToolPrompts,
        setRagRetrievalCount, setRagTranslationEnabled, setRagMultiQueryEnabled,
        setRagRerankEnabled, setRagAgenticEvalEnabled, setRagParentExpansionEnabled,
        setRagRelevanceThreshold,
        setSemanticCacheEnabled,
        setSemanticCacheThreshold,
        setInboxCaptureEnabled, setInitialMessage, setInitialQuestionMessage,
        setInitialIgnoreMessage, setQualificationQuestions, setQualificationLabels, setQualificationCriteria, setQualificationFinalAction, setSecurityBlacklist, setSecurityForbidden,
        setSecurityDiscount, setSecurityComplexity, setSecurityPii,
        setSecurityValidatorIa, setSecurityBotProtection, setSecurityMaxMessages,
        setSecuritySemanticThreshold, setSecurityLoopCount, setRouterEnabled,
        setRouterSimpleModel, setRouterSimpleFallbackModel, setRouterComplexModel,
        setRouterComplexFallbackModel, setHandoffEnabled, setResponseTranslationEnabled,
        setResponseTranslationFallbackLang, setUiPrimaryColor, setUiHeaderColor,
        setUiChatTitle, setUiWelcomeMessage, setModelSettings,
        setGreetingMode, setQuestionMode, setAdMode,
        setUnansweredHandoffEnabled, setUnansweredHandoffLimit, setUnansweredQuestionPrompt
    } = useConfig();

    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                // 1. Models
                try {
                    const modelsRes = await api.get('/models');
                    const modelsData = await modelsRes.json();
                    
                    let ftModelsData = [];
                    try {
                        const ftModelsRes = await api.get('/fine-tuning/models');
                        if (ftModelsRes.ok) ftModelsData = await ftModelsRes.json();
                    } catch (e) { console.warn("FT models unavailable", e); }

                    const baseModels = modelsData?.models || [];
                    const ftModels = (Array.isArray(ftModelsData) ? ftModelsData : []).map(m => ({
                        id: m.id,
                        name: `Fine-Tuning: ${m.id.split(':').slice(-1)[0]}`,
                        supports_tools: true,
                        supports_temperature: true,
                        is_finetuned: true
                    }));

                    const allModels = [...baseModels, ...ftModels];
                    if (allModels.length > 0) {
                        setModels(allModels);
                        if (modelsData.openai_connected !== undefined) setOpenaiConnected(modelsData.openai_connected);
                        if (modelsData.gemini_connected !== undefined) setGeminiConnected(modelsData.gemini_connected);
                        if (modelsData.anthropic_connected !== undefined) setAnthropicConnected(modelsData.anthropic_connected);
                    }
                } catch (err) {
                    console.error("Error fetching models:", err);
                }

                // 2. Knowledge Bases
                try {
                    const kbsRes = await api.get('/knowledge-bases');
                    const kbsData = await kbsRes.json();
                    setKbList(kbsData || []);
                } catch (e) { console.error("Error KBs:", e); }

                // 3. Tools
                try {
                    const toolsRes = await api.get('/tools');
                    const toolsData = await toolsRes.json();
                    setToolsList(Array.isArray(toolsData) ? toolsData : []);
                } catch (e) { console.error("Error Tools:", e); }

                // 4. Google Status
                try {
                    const googleRes = await api.get('/integrations/google/status');
                    if (googleRes.ok) {
                        const data = await googleRes.json();
                        setGoogleConnected(data.connected);
                    }
                } catch (e) { console.error("Error Google status:", e); }

                // 5. Agent Config
                if (!isNew && id) {
                    try {
                        const agentRes = await api.get(`/agents/${id}`);
                        const configData = await agentRes.json();

                        if (!configData || configData.detail) throw new Error("Agent data missing");

                        setName(configData.name || '');
                        setDescription(configData.description || '');
                        setSelectedModel(configData.model || "gpt-4o-mini");
                        setFallbackModel(configData.fallback_model);
                        if (configData.temperature !== undefined) setTemperature(configData.temperature);
                        if (configData.top_p !== undefined) setTopP(configData.top_p);
                        if (configData.date_awareness !== undefined) setDateAwareness(configData.date_awareness);
                        setDateAwarenessPastDays(configData.date_awareness_past_days ?? 7);
                        setDateAwarenessFutureDays(configData.date_awareness_future_days ?? 7);
                        setSystemPrompt(configData.system_prompt || '');
                        setDynamicPrompt(configData.dynamic_prompt || '');
                        setPreRouterPrompt(configData.pre_router_prompt || '');
                        setContextWindow(configData.context_window || 5);
                        setKnowledgeBaseIds(configData.knowledge_base_ids || (configData.knowledge_base_id ? [configData.knowledge_base_id] : []));
                        setRagRetrievalCount(configData.rag_retrieval_count ?? 5);
                        setRagTranslationEnabled(configData.rag_translation_enabled ?? false);
                        setRagMultiQueryEnabled(configData.rag_multi_query_enabled ?? false);
                        setRagRerankEnabled(configData.rag_rerank_enabled ?? true);
                        setRagAgenticEvalEnabled(configData.rag_agentic_eval_enabled ?? true);
                        setRagParentExpansionEnabled(configData.rag_parent_expansion_enabled ?? true);
                        setRagRelevanceThreshold(Math.round(((configData.rag_relevance_threshold ?? 0) * 100)));
                        setInboxCaptureEnabled(configData.inbox_capture_enabled ?? true);
                        setSelectedTools(configData.tool_ids || []);
                        setToolPrompts(configData.tool_prompts || {});
                        setSimulatedTime(configData.simulated_time || '');
                        setInitialMessage(configData.initial_message || '');
                        setInitialQuestionMessage(configData.initial_question_message || '');
                        setGreetingMode(configData.greeting_mode || 'prompt');
                        setQuestionMode(configData.question_mode || 'panel');
                        setAdMode(configData.ad_mode || 'panel');
                        
                        try {
                            const ignoreData = configData.initial_ignore_message;
                            if (ignoreData) {
                                if (typeof ignoreData === 'string' && ignoreData.startsWith('[')) setInitialIgnoreMessage(JSON.parse(ignoreData));
                                else if (Array.isArray(ignoreData)) setInitialIgnoreMessage(ignoreData);
                                else if (typeof ignoreData === 'string' && ignoreData.trim()) setInitialIgnoreMessage([ignoreData]);
                            }
                        } catch (e) { console.error("Error processing ignore messages", e); }

                        try {
                            const qqData = configData.qualification_questions;
                            if (qqData) {
                                if (typeof qqData === 'string' && qqData.startsWith('[')) setQualificationQuestions(JSON.parse(qqData));
                                else if (Array.isArray(qqData)) setQualificationQuestions(qqData);
                            }
                        } catch (e) { console.error("Error processing qualification questions", e); }

                        try {
                            const qlData = configData.qualification_labels;
                            if (qlData) {
                                if (typeof qlData === 'string' && qlData.startsWith('[')) setQualificationLabels(JSON.parse(qlData));
                                else if (Array.isArray(qlData)) setQualificationLabels(qlData);
                                else if (typeof qlData === 'string' && qlData.trim()) setQualificationLabels([qlData]);
                            }
                        } catch (e) { console.error("Error processing qualification labels", e); }
                        
                        setQualificationCriteria(configData.qualification_criteria || '');
                        setQualificationFinalAction(configData.qualification_final_action || '');

                        setSecurityBlacklist(configData.security_competitor_blacklist || '');
                        setSecurityForbidden(configData.security_forbidden_topics || '');
                        setSecurityDiscount(configData.security_discount_policy || '');
                        setSecurityComplexity(configData.security_language_complexity || 'standard');
                        setSecurityPii(configData.security_pii_filter || false);
                        setSecurityValidatorIa(configData.security_validator_ia || false);
                        setSecurityBotProtection(configData.security_bot_protection || false);
                        setSecurityMaxMessages(configData.security_max_messages_per_session || 20);
                        setSecuritySemanticThreshold(configData.security_semantic_threshold || 0.85);
                        setSecurityLoopCount(configData.security_loop_count || 3);
                        setUiPrimaryColor(configData.ui_primary_color || '#6366f1');
                        setUiHeaderColor(configData.ui_header_color || '#0f172a');
                        setUiChatTitle(configData.ui_chat_title || 'Suporte Inteligente');
                        setUiWelcomeMessage(configData.ui_welcome_message || 'Olá! Como posso te ajudar hoje?');
                        setRouterEnabled(configData.router_enabled ?? true);
                        setRouterSimpleModel(configData.router_simple_model || 'gpt-4o-mini');
                        setRouterSimpleFallbackModel(configData.router_simple_fallback_model || '');
                        setRouterComplexModel(configData.router_complex_model || 'gpt-4o');
                        setRouterComplexFallbackModel(configData.router_complex_fallback_model || '');
                        setHandoffEnabled(configData.handoff_enabled || false);
                        setResponseTranslationEnabled(configData.response_translation_enabled || false);
                        setResponseTranslationFallbackLang(configData.response_translation_fallback_lang || 'portuguese');
                        setSemanticCacheEnabled(configData.semantic_cache_enabled !== undefined ? configData.semantic_cache_enabled : true);
                        setSemanticCacheThreshold(Math.round((configData.semantic_cache_threshold || 0.92) * 100));
                        setModelSettings(configData.model_settings || {});

                        const handoffLimitVal = configData.unanswered_handoff_limit;
                        if (handoffLimitVal === 0) {
                            setUnansweredHandoffEnabled(false);
                            setUnansweredHandoffLimit(2);
                        } else {
                            setUnansweredHandoffEnabled(true);
                            setUnansweredHandoffLimit(handoffLimitVal !== undefined && handoffLimitVal !== null ? handoffLimitVal : 2);
                        }
                        setUnansweredQuestionPrompt(configData.unanswered_question_prompt || '');

                        if (configData.top_k !== undefined) setTopK(configData.top_k);
                        if (configData.presence_penalty !== undefined) setPresencePenalty(configData.presence_penalty);
                        if (configData.frequency_penalty !== undefined) setFrequencyPenalty(configData.frequency_penalty);
                        if (configData.safety_settings !== undefined) setSafetySettings(configData.safety_settings);
                        if (configData.reasoning_effort !== undefined) setReasoningEffort(configData.reasoning_effort);

                    } catch (err) {
                        console.error("Error loading agent:", err);
                        setStatus('Erro ao carregar agente');
                    }
                } else if (isNew) {
                    setSelectedModel("gpt-4o-mini");
                    setQualificationLabels([]);
                    setQualificationCriteria('');
                    setGreetingMode('prompt');
                    setQuestionMode('panel');
                    setAdMode('panel');
                    setDateAwarenessPastDays(7);
                    setDateAwarenessFutureDays(7);
                    setUnansweredHandoffEnabled(true);
                    setUnansweredHandoffLimit(2);
                    setUnansweredQuestionPrompt('');
                }
            } catch (err) {
                console.error("Global load error:", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [id, isNew]);
};

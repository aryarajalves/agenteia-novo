import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../../../../config';
import { parseDate } from '../utils/pipelineHelpers';

export function usePipelineEvent(initialEvent, webhookId) {
    const [event, setEvent] = useState(initialEvent);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!initialEvent?.processing_steps);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isTimeout, setIsTimeout] = useState(false);

    // Cache em memória para os detalhes completos de eventos já carregados (evita refetch e tela piscando)
    const eventCacheRef = useRef(new Map());
    const activeEventIdRef = useRef(initialEvent?.id);
    const abortControllerRef = useRef(null);
    const eventRef = useRef(event);

    useEffect(() => {
        eventRef.current = event;
    }, [event]);

    // Fallback defensivo: webhookConfigId
    const webhookConfigId = event?.webhook_config_id ?? webhookId;

    // Sincronizar e carregar detalhes quando initialEvent mudar por navegação
    useEffect(() => {
        if (!initialEvent?.id) return;
        const targetId = initialEvent.id;
        activeEventIdRef.current = targetId;

        // 1. Se já está no cache com processing_steps completos, carrega instantaneamente sem refetch
        if (eventCacheRef.current.has(targetId)) {
            const cached = eventCacheRef.current.get(targetId);
            setEvent(cached);
            setIsNavigating(false);
            setInitialLoading(false);
            return;
        }

        // 2. Se o próprio initialEvent já veio com processing_steps populado
        if (initialEvent.processing_steps && initialEvent.processing_steps.length > 0) {
            eventCacheRef.current.set(targetId, initialEvent);
            setEvent(initialEvent);
            setIsNavigating(false);
            setInitialLoading(false);
            return;
        }

        // 3. Atualiza os dados básicos imediatamente (sem quebrar a tela) e busca detalhes em segundo plano
        setEvent(initialEvent);
        setIsNavigating(true);

        // Cancela qualquer requisição anterior que ainda esteja em voo para evitar race condition
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const fetchDetails = async () => {
            try {
                const baseUrl = API_URL.replace(/\/$/, '');
                const url = webhookConfigId 
                    ? `${baseUrl}/webhooks/${webhookConfigId}/events/${targetId}`
                    : `${baseUrl}/webhooks/events/${targetId}`;
                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) return;
                const data = await res.json();

                // Guarda estrita: só aplica o resultado se o usuário AINDA estiver neste evento
                if (activeEventIdRef.current === targetId) {
                    const fullData = { ...initialEvent, ...data };
                    eventCacheRef.current.set(targetId, fullData);
                    setEvent(fullData);
                    setIsNavigating(false);
                    setInitialLoading(false);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Erro ao buscar detalhes do evento no pipeline:', err);
                }
            } finally {
                if (activeEventIdRef.current === targetId) {
                    setIsNavigating(false);
                    setInitialLoading(false);
                }
            }
        };

        fetchDetails();

        return () => {
            controller.abort();
        };
    }, [initialEvent?.id, webhookConfigId]);

    const fetchEventDetail = useCallback(async (forcedId) => {
        const idToFetch = forcedId || activeEventIdRef.current || event?.id;
        if (!idToFetch) return;

        try {
            const baseUrl = API_URL.replace(/\/$/, '');
            const url = webhookConfigId 
                ? `${baseUrl}/webhooks/${webhookConfigId}/events/${idToFetch}`
                : `${baseUrl}/webhooks/events/${idToFetch}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            
            if (activeEventIdRef.current === idToFetch) {
                setEvent(prev => {
                    const updated = { ...prev, ...data };
                    eventCacheRef.current.set(idToFetch, updated);
                    return updated;
                });
            }
        } catch (e) {
            console.error('Erro ao buscar detalhes do pipeline:', e);
        }
    }, [event?.id, webhookConfigId]);

    const pollEvent = useCallback(async () => {
        const cur = eventRef.current;
        if (!cur?.id || ['completed', 'error', 'canceled', 'grouped', 'ignored'].includes(cur?.status)) return;
        await fetchEventDetail(cur.id);
    }, [fetchEventDetail]);

    const handleManualRefresh = async () => {
        const curId = activeEventIdRef.current || event?.id;
        if (loading || !curId) return;
        setLoading(true);
        const minSpinDelay = new Promise(resolve => setTimeout(resolve, 550));
        try {
            const baseUrl = API_URL.replace(/\/$/, '');
            const url = webhookConfigId 
                ? `${baseUrl}/webhooks/${webhookConfigId}/events/${curId}`
                : `${baseUrl}/webhooks/events/${curId}`;
            const fetchPromise = fetch(url);
            const [res] = await Promise.all([fetchPromise, minSpinDelay]);
            if (res.ok) {
                const data = await res.json();
                if (activeEventIdRef.current === curId) {
                    setEvent(prev => {
                        const updated = { ...prev, ...data };
                        eventCacheRef.current.set(curId, updated);
                        return updated;
                    });
                }
            } else {
                console.error('Erro no refresh manual do pipeline: resposta não OK', res.status);
            }
        } catch (e) {
            await minSpinDelay;
            console.error('Erro no refresh manual do pipeline:', e);
        } finally {
            setLoading(false);
        }
    };

    // WebSocket conectado uma única vez por ciclo de vida do modal (evita churn de conexões na navegação rápida)
    useEffect(() => {
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    if (data.type === 'status_update' && data.event_id === activeEventIdRef.current) {
                        eventCacheRef.current.delete(data.event_id);
                        fetchEventDetail(data.event_id);
                    }
                } catch (e) { console.error('Erro WS Pipeline:', e); }
            };
        } catch (e) { console.error('Erro conexão WS Pipeline:', e); }

        const timer = setInterval(() => {
            const curId = activeEventIdRef.current;
            if (!curId) return;
            const curEvent = eventRef.current;
            if (!curEvent?.id || ['completed', 'error', 'canceled', 'grouped', 'ignored'].includes(curEvent?.status)) return;
            fetchEventDetail(curId);
        }, 3000);

        return () => {
            clearInterval(timer);
            if (ws) ws.close();
        };
    }, [webhookConfigId, fetchEventDetail]);

    // Detectar timeout de processamento longo no frontend
    useEffect(() => {
        setIsTimeout(false);
        if (!['processing', 'received', 'pending'].includes(event.status)) return;

        const checkTimeout = () => {
            const createdTime = parseDate(event.created_at || event.updated_at).getTime();
            const now = Date.now();
            if (now - createdTime > 90000) {
                setIsTimeout(true);
            }
        };

        checkTimeout();
        const interval = setInterval(checkTimeout, 2000);
        return () => clearInterval(interval);
    }, [event.status, event.created_at, event.updated_at]);

    // Bloquear scroll
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    return {
        event,
        setEvent,
        loading,
        initialLoading,
        isNavigating,
        isTimeout,
        pollEvent,
        handleManualRefresh
    };
}

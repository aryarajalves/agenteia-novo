import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../../../../config';
import { parseDate } from '../utils/pipelineHelpers';

export function usePipelineEvent(initialEvent, webhookId) {
    const [event, setEvent] = useState(initialEvent);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!initialEvent?.processing_steps);
    const [isTimeout, setIsTimeout] = useState(false);

    // Fallback defensivo: webhookConfigId
    const webhookConfigId = event?.webhook_config_id ?? webhookId;

    const fetchEventDetail = useCallback(async () => {
        if (!event?.id) return;

        try {
            const baseUrl = API_URL.replace(/\/$/, '');
            const url = webhookConfigId 
                ? `${baseUrl}/webhooks/${webhookConfigId}/events/${event.id}`
                : `${baseUrl}/webhooks/events/${event.id}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            setEvent(prev => ({ ...prev, ...data }));
        } catch (e) {
            console.error('Erro ao buscar detalhes do pipeline:', e);
        }
    }, [event?.id, webhookConfigId]);

    const pollEvent = useCallback(async () => {
        if (!event?.id || ['completed', 'error', 'canceled', 'grouped', 'ignored'].includes(event?.status)) return;
        await fetchEventDetail();
    }, [event?.id, event?.status, fetchEventDetail]);

    const handleManualRefresh = async () => {
        if (loading || !event?.id) return;
        setLoading(true);
        const minSpinDelay = new Promise(resolve => setTimeout(resolve, 550));
        try {
            const baseUrl = API_URL.replace(/\/$/, '');
            const url = webhookConfigId 
                ? `${baseUrl}/webhooks/${webhookConfigId}/events/${event.id}`
                : `${baseUrl}/webhooks/events/${event.id}`;
            const fetchPromise = fetch(url);
            const [res] = await Promise.all([fetchPromise, minSpinDelay]);
            if (res.ok) {
                const data = await res.json();
                setEvent(prev => ({ ...prev, ...data }));
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

    useEffect(() => {
        let isMounted = true;

        const initLoad = async () => {
            try {
                await fetchEventDetail();
            } finally {
                if (isMounted) setInitialLoading(false);
            }
        };
        initLoad();

        // WebSocket para atualizações instantâneas
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    if (data.type === 'status_update' && data.event_id === event.id) {
                        fetchEventDetail();
                    }
                } catch (e) { console.error('Erro WS Pipeline:', e); }
            };
        } catch (e) { console.error('Erro conexão WS Pipeline:', e); }

        const timer = setInterval(pollEvent, 3000);
        return () => {
            isMounted = false;
            clearInterval(timer);
            if (ws) ws.close();
        };
    }, [event.id, fetchEventDetail, pollEvent]);

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
        isTimeout,
        pollEvent,
        handleManualRefresh
    };
}

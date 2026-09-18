import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { API_URL } from '../../../../../config';

export const isUserMessage = (evt) => {
    if (!evt) return false;
    const isAgent = evt.dono === 'agente' || evt.dono === 'bot' || evt.dono === 'Agente' || evt.dono === 'Agente de IA';
    const isFollowUp = Boolean(
        evt.event_type === 'followup' || 
        evt.is_followup || 
        (typeof evt.mensagem === 'string' && evt.mensagem.toLowerCase().includes('follow-up')) ||
        (typeof evt.message_type === 'string' && evt.message_type.toLowerCase() === 'followup')
    );
    return !isAgent && !isFollowUp;
};

export function useUserMessagesNavigation(currentEvent, webhookId, eventsProp = null, onNavigateEvent = null) {
    const [fetchedEvents, setFetchedEvents] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const cleanPhone = useMemo(() => {
        const raw = currentEvent?.telefone || currentEvent?.phone || '';
        return String(raw).replace(/\D/g, '');
    }, [currentEvent?.telefone, currentEvent?.phone]);

    const webhookConfigId = currentEvent?.webhook_config_id ?? webhookId;

    // Buscar eventos do contato caso eventsProp não venha populado
    useEffect(() => {
        if (Array.isArray(eventsProp) && eventsProp.length > 1) return;
        if (!cleanPhone || !webhookConfigId) return;

        let isMounted = true;
        const fetchContactEvents = async () => {
            setLoadingMessages(true);
            try {
                const baseUrl = API_URL.replace(/\/$/, '');
                const res = await fetch(`${baseUrl}/webhooks/${webhookConfigId}/events?search=${cleanPhone}&event_type=all&limit=100`);
                if (res.ok) {
                    const data = await res.json();
                    const items = data.items || data.events || [];
                    if (isMounted) {
                        setFetchedEvents(items);
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar mensagens do usuário para navegação:', err);
            } finally {
                if (isMounted) setLoadingMessages(false);
            }
        };

        fetchContactEvents();

        return () => { isMounted = false; };
    }, [cleanPhone, webhookConfigId, eventsProp]);

    // Combinar e normalizar a lista de mensagens do usuário
    const userMessages = useMemo(() => {
        const sourceList = (Array.isArray(eventsProp) && eventsProp.length > 0)
            ? eventsProp
            : fetchedEvents;

        // Filtrar apenas mensagens reais enviadas pelo lead/usuário
        let filtered = sourceList.filter(isUserMessage);

        // Garantir que o evento atual esteja presente na lista
        if (currentEvent && !filtered.some(e => e.id === currentEvent.id)) {
            filtered = [currentEvent, ...filtered];
        }

        // Deduplicar por ID
        const map = new Map();
        filtered.forEach(e => {
            if (e && e.id) map.set(e.id, e);
        });

        const unique = Array.from(map.values());

        // Ordenar cronologicamente: do mais antigo (índice 0) ao mais recente (último índice)
        unique.sort((a, b) => {
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return (a.id || 0) - (b.id || 0);
        });

        return unique;
    }, [eventsProp, fetchedEvents, currentEvent?.id]);

    const currentIndex = useMemo(() => {
        if (!currentEvent?.id || userMessages.length === 0) return 0;
        const idx = userMessages.findIndex(m => m.id === currentEvent.id);
        return idx !== -1 ? idx : userMessages.length - 1;
    }, [userMessages, currentEvent?.id]);

    const totalMessages = userMessages.length;
    const isLastMessage = totalMessages <= 1 || currentIndex === totalMessages - 1;
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex !== -1 && currentIndex < totalMessages - 1;

    // Rastreamento sincronizado do índice de navegação para evitar race conditions em cliques rápidos consecutivos
    const activeIndexRef = useRef(currentIndex);
    useEffect(() => {
        activeIndexRef.current = currentIndex;
    }, [currentIndex]);

    const lastNavTimeRef = useRef(0);

    const goToPrevious = useCallback(() => {
        const now = Date.now();
        if (now - lastNavTimeRef.current < 80) return;
        lastNavTimeRef.current = now;

        if (activeIndexRef.current <= 0) return;
        const targetIndex = activeIndexRef.current - 1;
        activeIndexRef.current = targetIndex;
        const prevEvent = userMessages[targetIndex];
        if (prevEvent && onNavigateEvent) {
            onNavigateEvent(prevEvent);
        }
    }, [userMessages, onNavigateEvent]);

    const goToNext = useCallback(() => {
        const now = Date.now();
        if (now - lastNavTimeRef.current < 80) return;
        lastNavTimeRef.current = now;

        if (activeIndexRef.current >= userMessages.length - 1) return;
        const targetIndex = activeIndexRef.current + 1;
        activeIndexRef.current = targetIndex;
        const nextEvent = userMessages[targetIndex];
        if (nextEvent && onNavigateEvent) {
            onNavigateEvent(nextEvent);
        }
    }, [userMessages, onNavigateEvent]);

    const goToLast = useCallback(() => {
        if (isLastMessage || userMessages.length === 0) return;
        const lastIdx = userMessages.length - 1;
        activeIndexRef.current = lastIdx;
        const lastEvent = userMessages[lastIdx];
        if (lastEvent && onNavigateEvent) {
            onNavigateEvent(lastEvent);
        }
    }, [isLastMessage, userMessages, onNavigateEvent]);

    return {
        userMessages,
        currentIndex,
        totalMessages,
        isLastMessage,
        hasPrevious,
        hasNext,
        goToPrevious,
        goToNext,
        goToLast,
        loadingMessages
    };
}

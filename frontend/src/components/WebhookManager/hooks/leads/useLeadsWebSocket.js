import { useEffect } from 'react';
import { API_URL } from '../../../../config';

export const useLeadsWebSocket = ({
    webhookId,
    leadsModalRef,
    setLeadsModal,
    fetchLeads,
    handleImportWsMessage
}) => {
    useEffect(() => {
        if (!webhookId) return;

        let ws = null;
        let debounceTimer = null;
        let reconnectTimer = null;
        let isComponentMounted = true;

        const connectWs = () => {
            if (!isComponentMounted) return;
            try {
                const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    if (isComponentMounted) {
                        setLeadsModal(prev => prev ? ({ ...prev, liveConnected: true }) : prev);
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        // Delegado para o gerenciador de importação
                        const handledByImport = handleImportWsMessage(data);
                        if (handledByImport) return;

                        const isRelevant = (
                            (data.type === 'lead_created' || data.type === 'new_lead' || data.type === 'lead_updated' || data.type === 'lead_deleted' || data.type === 'leads_synced' || data.type === 'new_event') &&
                            (data.webhook_id === webhookId || !data.webhook_id)
                        );

                        if (isRelevant) {
                            if (debounceTimer) clearTimeout(debounceTimer);
                            debounceTimer = setTimeout(() => {
                                const current = leadsModalRef.current;
                                if (current && current.webhook && current.webhook.id === webhookId) {
                                    fetchLeads(
                                        current.webhook,
                                        current.page || 1,
                                        current.pageSize || 20,
                                        current.search || '',
                                        current.podeEnviar || 'all',
                                        current.dateStart || '',
                                        current.dateEnd || '',
                                        current.janelaAberta || 'all',
                                        current.semMensagens || 'all',
                                        true
                                    );
                                }
                            }, 300);
                        }
                    } catch (err) {
                        console.error('Erro ao processar mensagem WS no useLeads:', err);
                    }
                };

                ws.onclose = () => {
                    if (isComponentMounted) {
                        setLeadsModal(prev => prev ? ({ ...prev, liveConnected: false }) : prev);
                        if (reconnectTimer) clearTimeout(reconnectTimer);
                        reconnectTimer = setTimeout(connectWs, 3000);
                    }
                };

                ws.onerror = (err) => {
                    console.warn('Aviso de conexão WebSocket em useLeads:', err);
                };
            } catch (err) {
                console.warn('Falha ao conectar WebSocket em useLeads:', err);
                if (isComponentMounted) {
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(connectWs, 3000);
                }
            }
        };

        connectWs();

        return () => {
            isComponentMounted = false;
            if (debounceTimer) clearTimeout(debounceTimer);
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws) {
                try { ws.close(); } catch (_) {}
            }
        };
    }, [webhookId, fetchLeads, handleImportWsMessage]);
};

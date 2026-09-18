import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';

export const useImportChat = ({ webhook, onImportFinished }) => {
    const [isStartingImport, setIsStartingImport] = useState(false);
    const [isCancellingImport, setIsCancellingImport] = useState(false);
    const [importProgress, setImportProgress] = useState({
        isOpen: false,
        current: 0,
        total: 0,
        percentage: 0,
        status: '',
        createdLeads: 0,
        importedMessages: 0,
        currentContact: '',
        startedAt: null,
        elapsedSeconds: 0,
        done: false,
        cancelled: false,
        error: null
    });

    const onImportFinishedRef = useRef(onImportFinished);
    useEffect(() => {
        onImportFinishedRef.current = onImportFinished;
    }, [onImportFinished]);

    // Aplica atualizações de status de forma consistente (tanto de polling quanto de WebSocket)
    const applyStatusUpdate = useCallback((data) => {
        if (!data) return;

        const isCancelled = Boolean(data.type === 'chat_import_cancelled' || data.cancelled);
        const isDone = Boolean(data.done || data.type === 'chat_import_completed' || isCancelled);

        setImportProgress(prev => ({
            ...prev,
            isOpen: prev.isOpen !== undefined ? prev.isOpen : false,
            current: data.current !== undefined ? data.current : prev.current,
            total: data.total !== undefined ? data.total : prev.total,
            percentage: data.percentage !== undefined ? data.percentage : prev.percentage,
            status: data.status || prev.status,
            createdLeads: data.created_leads !== undefined ? data.created_leads : prev.createdLeads,
            importedMessages: data.imported_messages !== undefined ? data.imported_messages : prev.importedMessages,
            currentContact: data.current_contact || prev.currentContact,
            startedAt: data.started_at !== undefined ? data.started_at : prev.startedAt,
            elapsedSeconds: data.elapsed_seconds !== undefined ? data.elapsed_seconds : prev.elapsedSeconds,
            done: isDone,
            cancelled: isCancelled,
            error: data.error || null
        }));

        if (isDone || isCancelled) {
            if (onImportFinishedRef.current) {
                onImportFinishedRef.current();
            }
        }
    }, []);

    // Polling ativo: enquanto o modal estiver aberto e a importação em execução, sincroniza a cada 1.5s
    useEffect(() => {
        const webhookId = webhook?.id;
        if (!webhookId) return;

        let timer = null;
        let isMounted = true;

        const pollImportStatus = async () => {
            try {
                const res = await api.get(`/webhooks/${webhookId}/leads/import-status`);
                if (res.ok && isMounted) {
                    const data = await res.json();
                    if (data) {
                        applyStatusUpdate(data);
                    }
                }
            } catch (_) {}
        };

        // Verifica imediatamente se há processo ativo ou recém-finalizado
        pollImportStatus();

        // Se o modal estiver aberto e a importação estiver rodando, faz polling contínuo resiliente
        if (importProgress.isOpen && !importProgress.done && !importProgress.cancelled) {
            timer = setInterval(pollImportStatus, 1500);
        }

        return () => {
            isMounted = false;
            if (timer) clearInterval(timer);
        };
    }, [webhook?.id, importProgress.isOpen, importProgress.done, importProgress.cancelled, applyStatusUpdate]);

    // Trata eventos recebidos via WebSocket
    const handleImportWsMessage = useCallback((data) => {
        if (!data) return false;
        const types = ['chat_import_progress', 'chat_import_completed', 'chat_import_cancelled'];
        if (!types.includes(data.type)) return false;

        const webhookId = webhook?.id;
        const isMatching = !data.webhook_id || !webhookId || String(data.webhook_id) === String(webhookId);
        if (!isMatching) return false;

        applyStatusUpdate(data);

        if (data.type === 'chat_import_completed') {
            showToast('✅ Importação do ZapJords concluída com sucesso!');
        } else if (data.type === 'chat_import_cancelled') {
            showToast('🛑 Importação do ZapJords interrompida pelo usuário.');
        }

        return true;
    }, [webhook?.id, applyStatusUpdate]);

    const handleImportChat = async (targetWebhook) => {
        const activeWebhook = targetWebhook || webhook;
        if (!activeWebhook || !activeWebhook.id || isStartingImport) return;

        setIsStartingImport(true);
        setImportProgress({
            isOpen: true,
            current: 0,
            total: 0,
            percentage: 0,
            status: 'Conectando ao ZapJords e iniciando importação...',
            createdLeads: 0,
            importedMessages: 0,
            currentContact: '',
            startedAt: Date.now() / 1000,
            elapsedSeconds: 0,
            done: false,
            cancelled: false,
            error: null
        });

        try {
            const res = await api.post(`/webhooks/${activeWebhook.id}/leads/import-zapjords`);
            const data = await res.json();
            if (!res.ok) {
                const errMsg = data.detail || data.message || 'Erro ao iniciar importação';
                setImportProgress(prev => ({
                    ...prev,
                    error: errMsg,
                    status: errMsg,
                    done: true
                }));
                showToast(`⚠️ ${errMsg}`, 'error');
            } else {
                showToast('📥 Importação do ZapJords iniciada em segundo plano.');
            }
        } catch (err) {
            const errMsg = 'Falha de rede ao conectar com o servidor.';
            setImportProgress(prev => ({
                ...prev,
                error: errMsg,
                status: errMsg,
                done: true
            }));
            showToast(errMsg, 'error');
        } finally {
            setIsStartingImport(false);
        }
    };

    const cancelImport = async () => {
        const activeWebhook = webhook;
        if (!activeWebhook || !activeWebhook.id || isCancellingImport) return;

        setIsCancellingImport(true);
        try {
            const res = await api.post(`/webhooks/${activeWebhook.id}/leads/cancel-import`);
            const data = await res.json();
            if (res.ok && data.ok) {
                showToast('🛑 Solicitação de cancelamento enviada.');
                setImportProgress(prev => ({
                    ...prev,
                    status: 'Importação cancelada pelo usuário.',
                    done: true,
                    cancelled: true
                }));
                if (onImportFinishedRef.current) {
                    onImportFinishedRef.current();
                }
            } else {
                showToast(data.message || 'Erro ao cancelar importação', 'error');
            }
        } catch (e) {
            showToast('Falha ao conectar com o servidor para cancelar.', 'error');
        } finally {
            setIsCancellingImport(false);
        }
    };

    const closeImportProgress = () => {
        setImportProgress(prev => ({ ...prev, isOpen: false }));
    };

    const openImportProgress = () => {
        setImportProgress(prev => ({ ...prev, isOpen: true }));
    };

    return {
        importProgress,
        setImportProgress,
        isStartingImport,
        isCancellingImport,
        handleImportChat,
        cancelImport,
        openImportProgress,
        closeImportProgress,
        handleImportWsMessage
    };
};

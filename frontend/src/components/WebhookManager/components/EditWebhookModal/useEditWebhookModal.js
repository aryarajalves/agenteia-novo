import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../api/client';
import { showToast } from '../../utils/helpers';

export const useEditWebhookModal = ({
    editingWebhook,
    editTab,
    safeEditForm,
    setEditForm,
    fetchChatwootLabels
}) => {
    const isCreateMode = editingWebhook?.id === 'new';

    const [geralSubTab, setGeralSubTab] = useState('dados');
    const [segurancaSubTab, setSegurancaSubTab] = useState('permitidos');
    const [zapvoiceSubTab, setZapvoiceSubTab] = useState('credenciais');

    const [showToken, setShowToken] = useState(false);
    const [activeFollowupStepTab, setActiveFollowupStepTab] = useState(0);
    const [smartTriggerTab, setSmartTriggerTab] = useState('cancel');
    const [uploadingMediaIndex, setUploadingMediaIndex] = useState(null);
    const [fullscreenModal, setFullscreenModal] = useState({ isOpen: false });
    const [zapvoiceTemplates, setZapvoiceTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');
    const [uploadingHeaderMedia, setUploadingHeaderMedia] = useState(false);

    const handleUploadStepMedia = async (stepIndex, file) => {
        if (!file) return;
        try {
            setUploadingMediaIndex(stepIndex);
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/webhooks/upload-media', formData);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Falha no upload do arquivo');
            }
            const data = await response.json();
            if (data.url) {
                const s = [...safeEditForm.followup_steps];
                s[stepIndex] = { ...s[stepIndex], media_url: data.url };
                setEditForm({ ...safeEditForm, followup_steps: s });
                showToast('✅ Mídia enviada com sucesso!', 'success');
            }
        } catch (err) {
            console.error('Erro no upload de mídia:', err);
            showToast(err.message || '❌ Erro ao enviar mídia. Tente novamente.', 'error');
        } finally {
            setUploadingMediaIndex(null);
        }
    };

    const handleUploadHeaderMedia = async (stepIndex, file, headerFormat) => {
        if (!file) return;
        try {
            setUploadingHeaderMedia(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/webhooks/upload-media', formData);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Falha no upload do arquivo');
            }
            const data = await response.json();
            if (data.url) {
                const s = [...safeEditForm.followup_steps];
                s[stepIndex] = { 
                    ...s[stepIndex], 
                    template_header_media: data.url,
                    template_header_type: headerFormat || 'IMAGE'
                };
                setEditForm({ ...safeEditForm, followup_steps: s });
                showToast('✅ Mídia do cabeçalho enviada com sucesso!', 'success');
            }
        } catch (err) {
            console.error('Erro no upload de mídia do cabeçalho:', err);
            showToast(err.message || '❌ Erro ao enviar mídia. Tente novamente.', 'error');
        } finally {
            setUploadingHeaderMedia(false);
        }
    };

    const fetchZapvoiceTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        try {
            let res;
            if (!isCreateMode && editingWebhook?.id) {
                res = await api.get(`/webhooks/${editingWebhook.id}/whatsapp-templates`);
            } else {
                const params = new URLSearchParams();
                if (safeEditForm.zapvoice_url) params.append('zapvoice_url', safeEditForm.zapvoice_url);
                if (safeEditForm.zapvoice_api_token) params.append('zapvoice_api_token', safeEditForm.zapvoice_api_token);
                if (safeEditForm.zapvoice_client_id) params.append('zapvoice_client_id', safeEditForm.zapvoice_client_id);
                res = await api.get(`/webhooks/zapvoice/templates?${params.toString()}`);
            }
            if (res.ok) {
                const data = await res.json();
                setZapvoiceTemplates(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Erro ao buscar templates do ZapVoice:', e);
        } finally {
            setLoadingTemplates(false);
        }
    }, [editingWebhook?.id, isCreateMode, safeEditForm.zapvoice_url, safeEditForm.zapvoice_api_token, safeEditForm.zapvoice_client_id]);

    useEffect(() => {
        if (editTab === 'geral' && geralSubTab === 'followup') {
            fetchZapvoiceTemplates();
        }
    }, [editTab, geralSubTab, fetchZapvoiceTemplates]);

    useEffect(() => {
        if (editTab === 'zapvoice' && fetchChatwootLabels) {
            fetchChatwootLabels({
                zapvoice_url: safeEditForm.zapvoice_url,
                zapvoice_api_token: safeEditForm.zapvoice_api_token,
                zapvoice_client_id: safeEditForm.zapvoice_client_id
            });
        }
    }, [editTab, safeEditForm.zapvoice_url, safeEditForm.zapvoice_api_token, safeEditForm.zapvoice_client_id, fetchChatwootLabels]);

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    return {
        isCreateMode,
        geralSubTab,
        setGeralSubTab,
        segurancaSubTab,
        setSegurancaSubTab,
        zapvoiceSubTab,
        setZapvoiceSubTab,
        showToken,
        setShowToken,
        activeFollowupStepTab,
        setActiveFollowupStepTab,
        smartTriggerTab,
        setSmartTriggerTab,
        uploadingMediaIndex,
        fullscreenModal,
        setFullscreenModal,
        zapvoiceTemplates,
        loadingTemplates,
        templateSearchTerm,
        setTemplateSearchTerm,
        uploadingHeaderMedia,
        handleUploadStepMedia,
        handleUploadHeaderMedia,
        fetchZapvoiceTemplates
    };
};

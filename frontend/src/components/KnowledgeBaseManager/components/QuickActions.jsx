import React, { useRef, useState } from 'react';
import { useKB } from '../KBContext';
import { useNavigate } from 'react-router-dom';
import { uploadManager } from '../../../api/uploadManager';
import { api } from '../../../api/client';

const QuickActions = () => {
    const { 
        kbType, kbId, 
        setIsTranscribing, setPendingFile, setShowImporter,
        transcriptionConfig, reloadKnowledgeBase
    } = useKB();
    const navigate = useNavigate();
    const videoInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const jsonInputRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const triggerToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setPendingFile(file);
                setShowImporter(true);
            }
        };
        input.click();
    };

    const handleExportJSON = async () => {
        if (!kbId) return;
        try {
            setLoading(true);
            const res = await api.get(`/knowledge-bases/${kbId}/export`);
            if (!res.ok) throw new Error('Falha ao exportar base de conhecimento.');
            const data = await res.json();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `base_conhecimento_${kbId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            triggerToast('Base de conhecimento exportada com sucesso!', 'success');
        } catch (e) {
            console.error('Erro ao exportar base:', e);
            triggerToast('Erro ao exportar base de conhecimento.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleImportJSON = async (e) => {
        const file = e.target.files[0];
        if (!file || !kbId) return;
        e.target.value = '';
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post(`/knowledge-bases/${kbId}/import`, formData);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Erro ao importar arquivo JSON.');
            }
            const data = await res.json();
            triggerToast(data.message || 'Itens importados com sucesso!', 'success');
            if (reloadKnowledgeBase) await reloadKnowledgeBase();
        } catch (err) {
            console.error('Erro no import JSON:', err);
            triggerToast(err.message || 'Falha ao importar o arquivo JSON.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVideoTranscribe = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        uploadManager.startUpload(kbId, file, transcriptionConfig);
        navigate('/knowledge-bases?tab=history');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = '';
        setPendingFile(file);
        setShowImporter(true);
    };

    return (
        <div className="kb-quick-actions">
            <button onClick={handleExportJSON} disabled={loading} className="kb-quick-action-btn highlight-btn">
                📤 Exportar Base (JSON)
            </button>
            <button onClick={() => jsonInputRef.current?.click()} disabled={loading} className="kb-quick-action-btn">
                📥 Importar JSON
            </button>
            <button onClick={handleImportClick} className="kb-quick-action-btn">📥 Importar CSV / Excel</button>
            {kbType !== 'product' && (
                <>
                    <button onClick={() => setShowImporter(true)} className="kb-quick-action-btn">📋 Colar Texto</button>
                    <button onClick={() => videoInputRef.current?.click()} className="kb-quick-action-btn">
                        📽️ Transcrição de Vídeo
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="kb-quick-action-btn">
                        📄 Upload PDF/DOCX
                    </button>
                    <input
                        type="file"
                        ref={jsonInputRef}
                        style={{ display: 'none' }}
                        onChange={handleImportJSON}
                        accept=".json"
                    />
                    <input
                        type="file"
                        ref={videoInputRef}
                        style={{ display: 'none' }}
                        onChange={handleVideoTranscribe}
                        accept="video/*,audio/*"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.txt"
                    />
                </>
            )}
        </div>
    );
};

export default QuickActions;

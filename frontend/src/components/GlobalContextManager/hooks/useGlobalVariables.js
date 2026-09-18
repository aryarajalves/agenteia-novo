import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

export function useGlobalVariables() {
    const [variables, setVariables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingVar, setEditingVar] = useState(null);
    const [newVar, setNewVar] = useState({ 
        key: '', 
        value: '', 
        type: 'string', 
        description: '', 
        extraction_method: 'integration', 
        extraction_prompt: '' 
    });
    const [deleteVar, setDeleteVar] = useState(null);
    const [saving, setSaving] = useState(null);

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message, type }
        }));
    };

    const fetchVariables = async () => {
        try {
            const res = await api.get(`/global-variables`);
            const data = await res.json();
            setVariables(data || []);
        } catch (e) {
            console.error("Erro ao buscar variáveis globais", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVariables();
    }, []);

    const handleUpdate = async (v) => {
        setSaving(v.id);
        try {
            const res = await api.put(`/global-variables/${v.id}`, v);
            if (res.ok) {
                showToast("Variável atualizada com sucesso!");
            }
        } catch (e) {
            showToast("Erro ao salvar variável", "error");
        } finally {
            setSaving(null);
        }
    };

    const handleSaveEdit = async (updatedVar) => {
        if (!updatedVar) return;
        setSaving(updatedVar.id);
        try {
            const res = await api.put(`/global-variables/${updatedVar.id}`, updatedVar);
            if (res.ok) {
                setEditingVar(null);
                await fetchVariables();
                showToast("Variável atualizada com sucesso!");
                return true;
            } else {
                const data = await res.json();
                showToast(data.detail || "Erro ao salvar alterações", "error");
                return false;
            }
        } catch (e) {
            showToast("Erro de conexão ao salvar variável", "error");
            return false;
        } finally {
            setSaving(null);
        }
    };

    const handleCreate = async () => {
        if (!newVar.key.trim()) return;
        try {
            const res = await api.post(`/global-variables`, newVar);
            if (res.ok) {
                setNewVar({ 
                    key: '', 
                    value: '', 
                    type: 'string', 
                    description: '', 
                    extraction_method: 'integration', 
                    extraction_prompt: '' 
                });
                setIsAdding(false);
                await fetchVariables();
                showToast("Variável criada com sucesso!");
            } else {
                const data = await res.json();
                showToast(data.detail || "Erro ao criar variável", "error");
            }
        } catch (e) {
            showToast("Erro de conexão", "error");
        }
    };

    const handleDelete = async () => {
        if (!deleteVar) return;
        try {
            await api.delete(`/global-variables/${deleteVar.id}`);
            await fetchVariables();
            showToast("Variável excluída com sucesso!");
        } catch (e) {
            showToast("Erro ao deletar", "error");
        } finally {
            setDeleteVar(null);
        }
    };

    return {
        variables,
        setVariables,
        loading,
        isAdding,
        setIsAdding,
        editingVar,
        setEditingVar,
        handleSaveEdit,
        newVar,
        setNewVar,
        deleteVar,
        setDeleteVar,
        saving,
        handleUpdate,
        handleCreate,
        handleDelete
    };
}

import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

export function useGlobalVariables() {
    const [variables, setVariables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
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
            await api.put(`/global-variables/${v.id}`, v);
        } catch (e) {
            alert("Erro ao salvar variável");
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
                fetchVariables();
            } else {
                const data = await res.json();
                alert(data.detail || "Erro ao criar variável");
            }
        } catch (e) {
            alert("Erro de conexão");
        }
    };

    const handleDelete = async () => {
        if (!deleteVar) return;
        try {
            await api.delete(`/global-variables/${deleteVar.id}`);
            fetchVariables();
        } catch (e) {
            alert("Erro ao deletar");
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

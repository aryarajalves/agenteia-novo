import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../../api/client';

export const useKnowledgeBaseEditor = () => {
    const { id } = useParams();
    const location = useLocation();
    const isNew = id === 'new';
    const navigate = useNavigate();
    
    // Pegar a view desejada via query param (?view=metadata ou ?view=content)
    const searchParams = new URLSearchParams(location.search);
    const initialView = searchParams.get('view') || (isNew ? 'metadata' : 'content');
    const [view, setView] = useState(initialView);

    const [name, setName] = useState(isNew ? 'Nova Base de Conhecimento' : '');
    const [description, setDescription] = useState('');
    const [kbType, setKbType] = useState('qa'); // 'qa' or 'product'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(!isNew);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        if (!isNew) {
            api.get(`/knowledge-bases/${id}`)
                .then(res => res.json())
                .then(data => {
                    setName(data.name || '');
                    setDescription(data.description || '');
                    setKbType(data.kb_type || 'qa');
                    setItems(data.items || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Erro ao carregar base:", err);
                    setLoading(false);
                });
        }
    }, [id, isNew]);

    // Atualiza a visualização se o parâmetro mudar
    useEffect(() => {
        const v = searchParams.get('view');
        if (v) setView(v);
    }, [location.search]);

    // Clear status toast after some time
    useEffect(() => {
        if (status && status.type !== 'info') {
            const timer = setTimeout(() => {
                setStatus(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleSave = async () => {
        if (!name.trim()) {
            setStatus({ type: 'error', message: 'O nome da base é obrigatório.' });
            return;
        }

        setStatus({ type: 'info', message: 'Salvando...' });
        const payload = {
            name: name.trim(),
            description,
            kb_type: kbType
        };

        try {
            const url = isNew ? `/knowledge-bases` : `/knowledge-bases/${id}`;
            const response = await (isNew ? api.post(url, payload) : api.put(url, payload));

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'Dados da base salvos com sucesso!' });
                if (isNew) {
                    setTimeout(() => navigate(`/knowledge-bases/${data.id}?view=content`), 800);
                }
            } else {
                const errorMsg = data.detail || 'Erro ao salvar base.';
                setStatus({ type: 'error', message: errorMsg });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Erro de conexão com o servidor.' });
        }
    };

    const handleAddItem = async (question, answer, category, metadata, question_variations) => {
        if (isNew) return false;

        try {
            const response = await api.post(`/knowledge-bases/${id}/items`, { 
                question, 
                answer, 
                category, 
                metadata_val: metadata,
                question_variations: question_variations || []
            });
            if (response.ok) {
                const newItem = await response.json();
                setItems([...items, newItem]);
                return true;
            }
            const err = await response.json().catch(() => ({}));
            setStatus({ type: 'error', message: err.detail || 'Erro ao adicionar item à base.' });
            return false;
        } catch (err) {
            console.error("Erro ao adicionar item:", err);
            setStatus({ type: 'error', message: 'Erro de conexão ao adicionar item.' });
            return false;
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            const response = await api.delete(`/knowledge-items/${itemId}`);
            if (response.ok) {
                setItems(items.filter(i => i.id !== itemId));
            }
        } catch (err) {
            console.error("Erro ao deletar item:", err);
        }
    };

    const handleUpdateItem = async (itemId, question, answer, category, metadata, question_variations) => {
        try {
            const response = await api.put(`/knowledge-items/${itemId}`, { 
                question, 
                answer, 
                category, 
                metadata_val: metadata,
                question_variations: question_variations || []
            });
            if (response.ok) {
                const updated = await response.json();
                setItems(items.map(i => i.id === itemId ? updated : i));
                return true;
            }
            const err = await response.json().catch(() => ({}));
            setStatus({ type: 'error', message: err.detail || 'Erro ao atualizar item.' });
            return false;
        } catch (err) {
            console.error("Erro ao atualizar item:", err);
            setStatus({ type: 'error', message: 'Erro de conexão ao atualizar item.' });
            return false;
        }
    };

    return {
        id,
        isNew,
        view,
        setView,
        name,
        setName,
        description,
        setDescription,
        kbType,
        setKbType,
        items,
        loading,
        status,
        setStatus,
        handleSave,
        handleAddItem,
        handleDeleteItem,
        handleUpdateItem,
        navigate
    };
};

export default useKnowledgeBaseEditor;

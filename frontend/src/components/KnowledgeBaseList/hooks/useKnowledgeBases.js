import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

export const BASES_PER_PAGE = 6;

export function useKnowledgeBases() {
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, baseId: null, baseName: '' });
    const [filterType, setFilterType] = useState('all'); // 'all', 'qa', 'product'
    const [selectedBases, setSelectedBases] = useState(new Set());
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchBases = () => {
        setLoading(bases.length === 0);
        api.get('/knowledge-bases')
            .then(res => res.json())
            .then(data => {
                setBases(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Erro ao buscar bases:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchBases();
    }, []);

    const handleExportJSON = async (e, baseId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await api.get(`/knowledge-bases/${baseId}/export`);
            if (!res.ok) throw new Error('Falha ao exportar base.');
            const data = await res.json();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `base_conhecimento_${baseId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Base exportada com sucesso!', type: 'success' } }));
        } catch (err) {
            console.error('Erro ao exportar:', err);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao exportar base.', type: 'error' } }));
        }
    };

    const handleImportNewJSON = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/knowledge-bases/import-new', formData);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Erro ao importar nova base.');
            }
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Nova base importada com sucesso!', type: 'success' } }));
            fetchBases();
        } catch (err) {
            console.error('Erro na importação:', err);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: err.message || 'Falha ao importar nova base.', type: 'error' } }));
        } finally {
            setIsImporting(false);
        }
    };

    const handleDeleteClick = (e, id, name) => {
        e.preventDefault();
        setModalConfig({ isOpen: true, baseId: id, baseName: name });
    };

    const handleConfirmDelete = () => {
        const { baseId } = modalConfig;
        setIsDeleting(true);
        api.delete(`/knowledge-bases/${baseId}`)
            .then(res => {
                if (res.ok) {
                    setBases(bases.filter(b => b.id !== baseId));
                } else {
                    alert('Erro ao excluir');
                }
            })
            .catch(() => alert('Erro de conexão'))
            .finally(() => {
                setIsDeleting(false);
                setModalConfig({ isOpen: false, baseId: null, baseName: '' });
            });
    };

    const filteredBases = bases.filter(base => {
        if (filterType === 'all') return true;
        if (filterType === 'qa') return base.kb_type === 'qa';
        if (filterType === 'product') return base.kb_type === 'product';
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredBases.length / BASES_PER_PAGE));
    const paginatedBases = filteredBases.slice(
        (currentPage - 1) * BASES_PER_PAGE,
        currentPage * BASES_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [filterType]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const toggleSelectBase = (id) => {
        const newSelected = new Set(selectedBases);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedBases(newSelected);
    };

    const toggleSelectAllBases = () => {
        if (selectedBases.size === filteredBases.length && filteredBases.length > 0) {
            setSelectedBases(new Set());
        } else {
            setSelectedBases(new Set(filteredBases.map(b => b.id)));
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await api.post('/knowledge-bases/batch-delete', {
                item_ids: Array.from(selectedBases).map(Number)
            });
            if (response.ok) {
                const idsToRemove = Array.from(selectedBases);
                setBases(prev => prev.filter(b => !idsToRemove.includes(b.id)));
                setSelectedBases(new Set());
            } else {
                alert('Erro ao excluir bases em massa');
            }
        } catch {
            alert('Erro de conexão');
        } finally {
            setIsDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    return {
        bases,
        loading,
        isDeleting,
        isImporting,
        modalConfig,
        setModalConfig,
        filterType,
        setFilterType,
        selectedBases,
        setSelectedBases,
        isBulkDeleteConfirmOpen,
        setIsBulkDeleteConfirmOpen,
        currentPage,
        setCurrentPage,
        totalPages,
        filteredBases,
        paginatedBases,
        fetchBases,
        handleExportJSON,
        handleImportNewJSON,
        handleDeleteClick,
        handleConfirmDelete,
        toggleSelectBase,
        toggleSelectAllBases,
        handleBulkDelete
    };
}

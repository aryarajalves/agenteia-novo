import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

export const WHATSAPP_MEDIA_LIMITS_MB = { image: 5, video: 16 };

export function useTestimonials() {
    const [testimonials, setTestimonials] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [mediaTypeFilter, setMediaTypeFilter] = useState('all');

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Estado de Upload e Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('');
    const [uploading, setUploading] = useState(false);

    const [loading, setLoading] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [testimonialToDelete, setTestimonialToDelete] = useState(null);

    // Estado do Modal de Edição (categoria + legenda)
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [testimonialToEdit, setTestimonialToEdit] = useState(null);
    const [editCategory, setEditCategory] = useState('');
    const [editCaption, setEditCaption] = useState('');
    const [editFilename, setEditFilename] = useState('');
    const [editPosition, setEditPosition] = useState(1);
    const [savingEdit, setSavingEdit] = useState(false);

    // Estados de Categoria
    const [categories, setCategories] = useState([]);
    const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleteCategoryConfirmOpen, setDeleteCategoryConfirmOpen] = useState(false);

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
    };

    const loadCategories = async () => {
        try {
            const response = await api.get('/testimonials/categories');
            if (response.ok) {
                const data = await response.json();
                const mapped = (data || []).map(c => ({ id: c.id, value: c.value, label: c.name }));
                setCategories(mapped);
                if (mapped.length > 0 && !uploadCategory) {
                    setUploadCategory(mapped[0].value);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar categorias:", err);
        }
    };

    const loadTestimonials = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/testimonials`);
            if (response.ok) {
                const data = await response.json();
                setTestimonials(data || []);
            }
        } catch (err) {
            console.error("Erro ao carregar depoimentos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTestimonials();
        loadCategories();
    }, []);

    const handleCreateCategory = async (e) => {
        e?.preventDefault?.();
        if (!newCategoryName.trim()) return;

        try {
            const response = await api.post('/testimonials/categories', { name: newCategoryName });
            const data = await response.json();
            if (response.ok) {
                showToast('Categoria criada com sucesso!');
                setNewCategoryName('');
                loadCategories();
            } else {
                showToast(data.detail || 'Erro ao criar categoria.', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor.', 'error');
        }
    };

    const handleDeleteCategoryClick = (category) => {
        setCategoryToDelete(category);
        setDeleteCategoryConfirmOpen(true);
    };

    const confirmDeleteCategory = async () => {
        if (!categoryToDelete) return;
        setDeleteCategoryConfirmOpen(false);

        try {
            const response = await api.delete(`/testimonials/categories/${categoryToDelete.id}`);
            if (response.ok) {
                showToast('Categoria e depoimentos associados excluídos!');
                loadCategories();
                loadTestimonials();
            } else {
                const data = await response.json();
                showToast(data.detail || 'Erro ao excluir categoria.', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor.', 'error');
        } finally {
            setCategoryToDelete(null);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const mediaKind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
        const fileSizeMB = file.size / (1024 * 1024);
        const maxSizeMB = mediaKind ? WHATSAPP_MEDIA_LIMITS_MB[mediaKind] : null;

        if (mediaKind && maxSizeMB && fileSizeMB > maxSizeMB) {
            showToast(
                `❌ Arquivo muito grande: ${fileSizeMB.toFixed(1)}MB. O WhatsApp só aceita ${mediaKind === 'image' ? 'imagens' : 'vídeos'} de até ${maxSizeMB}MB — o envio para o cliente falharia.`,
                'error'
            );
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory);

        setUploading(true);
        showToast('Iniciando upload do depoimento...', 'info');

        try {
            const response = await api.post('/testimonials/upload', formData);
            const data = await response.json();
            if (response.ok) {
                showToast(`✅ Depoimento enviado com sucesso! (${fileSizeMB.toFixed(1)}MB, dentro do limite de ${maxSizeMB || '?'}MB do WhatsApp)`);
                setUploadModalOpen(false);
                loadTestimonials();
            } else {
                showToast(data.detail || 'Erro ao enviar depoimento.', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão ao enviar arquivo.', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDeleteClick = (testimonial) => {
        setTestimonialToDelete(testimonial);
        setDeleteModalOpen(true);
    };

    const handleEditClick = (testimonial) => {
        setTestimonialToEdit(testimonial);
        setEditCategory(testimonial.category);
        setEditCaption(testimonial.caption || '');
        setEditFilename(testimonial.filename || '');
        const categorySiblings = testimonials.filter(t => t.category === testimonial.category && t.media_type === testimonial.media_type);
        const currentIndex = categorySiblings.findIndex(t => t.id === testimonial.id);
        setEditPosition(testimonial.order_position || (currentIndex >= 0 ? currentIndex + 1 : 1));
        setEditModalOpen(true);
    };

    const handleCloseEdit = () => {
        setEditModalOpen(false);
        setTestimonialToEdit(null);
    };

    const editModalMaxPosition = testimonialToEdit
        ? testimonials.filter(t => t.category === testimonialToEdit.category && t.media_type === testimonialToEdit.media_type).length
        : 1;

    const handleSaveEdit = async () => {
        if (!testimonialToEdit) return;
        setSavingEdit(true);

        try {
            const response = await api.patch(`/testimonials/${testimonialToEdit.id}`, {
                category: editCategory,
                caption: editCaption,
                filename: editFilename,
                order_position: parseInt(editPosition, 10) || 1
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Depoimento atualizado com sucesso!');
                loadTestimonials();
                handleCloseEdit();
            } else {
                showToast(data.detail || 'Erro ao atualizar depoimento.', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor.', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleMove = async (item, direction) => {
        try {
            const response = await api.post(`/testimonials/${item.id}/move`, { direction });
            if (response.ok) {
                loadTestimonials();
            } else {
                const data = await response.json();
                showToast(data.detail || 'Erro ao reordenar depoimento.', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor.', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!testimonialToDelete) return;
        setDeleteModalOpen(false);

        try {
            const response = await api.delete(`/testimonials/${testimonialToDelete.id}`);
            if (response.ok) {
                showToast('Depoimento excluído com sucesso!');
                setTestimonials(testimonials.filter(t => t.id !== testimonialToDelete.id));
            } else {
                showToast('Erro ao excluir depoimento.', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor.', 'error');
        } finally {
            setTestimonialToDelete(null);
        }
    };

    const handleMediaError = (e) => {
        const currentSrc = e.target.src;
        if (currentSrc && currentSrc.includes('localhost:9008')) {
            e.target.src = currentSrc.replace('localhost:9008', '127.0.0.1:9008');
        }
    };

    const filteredTestimonials = testimonials.filter(item => {
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchType = mediaTypeFilter === 'all' || item.media_type === mediaTypeFilter;
        return matchCategory && matchType;
    });

    const totalItems = filteredTestimonials.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedItems = filteredTestimonials.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [categoryFilter, mediaTypeFilter, pageSize]);

    return {
        testimonials,
        setTestimonials,
        categories,
        categoryFilter,
        setCategoryFilter,
        mediaTypeFilter,
        setMediaTypeFilter,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        uploadModalOpen,
        setUploadModalOpen,
        uploadCategory,
        setUploadCategory,
        uploading,
        loading,
        deleteModalOpen,
        setDeleteModalOpen,
        testimonialToDelete,
        editModalOpen,
        testimonialToEdit,
        editCategory,
        setEditCategory,
        editCaption,
        setEditCaption,
        editFilename,
        setEditFilename,
        editPosition,
        setEditPosition,
        savingEdit,
        manageCategoriesOpen,
        setManageCategoriesOpen,
        newCategoryName,
        setNewCategoryName,
        categoryToDelete,
        deleteCategoryConfirmOpen,
        setDeleteCategoryConfirmOpen,
        handleCreateCategory,
        handleDeleteCategoryClick,
        confirmDeleteCategory,
        handleFileUpload,
        handleDeleteClick,
        handleEditClick,
        handleCloseEdit,
        editModalMaxPosition,
        handleSaveEdit,
        handleMove,
        confirmDelete,
        handleMediaError,
        filteredTestimonials,
        totalItems,
        totalPages,
        paginatedItems
    };
}

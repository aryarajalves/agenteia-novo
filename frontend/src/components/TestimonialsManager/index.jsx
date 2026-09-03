import React from 'react';
import { useTestimonials } from './hooks/useTestimonials';
import TestimonialsHeader from './components/TestimonialsHeader';
import TestimonialsFilterBar from './components/TestimonialsFilterBar';
import TestimonialsGrid from './components/TestimonialsGrid';
import TestimonialsPagination from './components/TestimonialsPagination';
import UploadTestimonialModal from '../testimonials/UploadTestimonialModal';
import EditTestimonialModal from '../testimonials/EditTestimonialModal';
import ManageCategoriesModal from '../testimonials/ManageCategoriesModal';
import ConfirmModal from '../ConfirmModal';

function TestimonialsManager() {
    const {
        testimonials,
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
        totalPages,
        paginatedItems
    } = useTestimonials();

    return (
        <div className="dashboard-container">
            <TestimonialsHeader
                onOpenManageCategories={() => setManageCategoriesOpen(true)}
                onOpenUploadModal={() => setUploadModalOpen(true)}
            />

            <TestimonialsFilterBar
                categories={categories}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                mediaTypeFilter={mediaTypeFilter}
                setMediaTypeFilter={setMediaTypeFilter}
                pageSize={pageSize}
                setPageSize={setPageSize}
            />

            <TestimonialsGrid
                loading={loading}
                paginatedItems={paginatedItems}
                testimonials={testimonials}
                categories={categories}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onMediaError={handleMediaError}
                onMove={handleMove}
            />

            <TestimonialsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <UploadTestimonialModal
                isOpen={uploadModalOpen}
                categories={categories}
                uploadCategory={uploadCategory}
                setUploadCategory={setUploadCategory}
                uploading={uploading}
                onFileUpload={handleFileUpload}
                onClose={() => setUploadModalOpen(false)}
            />

            <EditTestimonialModal
                isOpen={editModalOpen}
                testimonial={testimonialToEdit}
                categories={categories}
                editCategory={editCategory}
                setEditCategory={setEditCategory}
                editCaption={editCaption}
                setEditCaption={setEditCaption}
                editFilename={editFilename}
                setEditFilename={setEditFilename}
                editPosition={editPosition}
                setEditPosition={setEditPosition}
                maxPosition={editModalMaxPosition}
                saving={savingEdit}
                onSave={handleSaveEdit}
                onClose={handleCloseEdit}
            />

            <ManageCategoriesModal
                isOpen={manageCategoriesOpen}
                categories={categories}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                onCreateCategory={handleCreateCategory}
                onDeleteCategoryClick={handleDeleteCategoryClick}
                onClose={() => setManageCategoriesOpen(false)}
            />

            <ConfirmModal
                isOpen={deleteCategoryConfirmOpen}
                onCancel={() => setDeleteCategoryConfirmOpen(false)}
                onConfirm={confirmDeleteCategory}
                title="Excluir Categoria"
                message={`Deseja realmente excluir a categoria "${categoryToDelete?.label}"? Todos os depoimentos vinculados a ela também serão permanentemente excluídos do storage e do banco.`}
            />

            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Depoimento"
                message={`Deseja realmente excluir o depoimento "${testimonialToDelete?.filename}"? Esta ação removerá permanentemente o arquivo do storage e não poderá ser desfeita.`}
            />
        </div>
    );
}

export default TestimonialsManager;

import React from 'react';
import ConfirmModal from '../ConfirmModal';

const BackupModals = ({
    confirmDelete,
    setConfirmDelete,
    handleConfirmDelete,
    confirmRestore,
    setConfirmRestore,
    handleConfirmRestore,
    restoringBackup,
    confirmDeleteBatch,
    setConfirmDeleteBatch,
    handleConfirmDeleteBatch,
    deletingBatch
}) => {
    return (
        <>
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onCancel={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Excluir Backup"
                message={`Tem certeza que deseja excluir permanentemente o backup "${confirmDelete.filename}" do S3 e do banco de dados? Esta ação é irreversível.`}
                confirmText="Excluir permanentemente"
                cancelText="Cancelar"
                type="danger"
            />

            <ConfirmModal
                isOpen={confirmRestore.isOpen}
                onCancel={() => setConfirmRestore({ ...confirmRestore, isOpen: false })}
                onConfirm={handleConfirmRestore}
                title="Restaurar Banco de Dados"
                message={`⚠️ AVISO CRÍTICO: Tem certeza de que deseja restaurar o banco de dados para a versão do backup "${confirmRestore.filename}"? Todos os dados atuais do sistema serão substituídos e o painel será reiniciado.`}
                confirmText={restoringBackup ? "Restaurando..." : "Sim, Restaurar Agora"}
                cancelText="Cancelar"
                type="danger"
            />

            <ConfirmModal
                isOpen={confirmDeleteBatch.isOpen}
                onCancel={() => setConfirmDeleteBatch({ isOpen: false, ids: [] })}
                onConfirm={handleConfirmDeleteBatch}
                title="Excluir Backups em Lote"
                message={`Tem certeza que deseja excluir permanentemente os ${confirmDeleteBatch.ids.length} backups selecionados do S3 e do banco de dados? Esta ação é irreversível.`}
                confirmText={deletingBatch ? "Excluindo..." : "Excluir permanentemente"}
                cancelText="Cancelar"
                type="danger"
            />
        </>
    );
};

export default BackupModals;

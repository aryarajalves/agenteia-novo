import React from 'react';
import { useGlobalVariables } from './hooks/useGlobalVariables';
import GlobalContextCardHeader from './components/GlobalContextCardHeader';
import GlobalVariablesList from './components/GlobalVariablesList';
import AddVariableModal from './components/AddVariableModal';
import EditVariableModal from './components/EditVariableModal';
import ConfirmModal from '../ConfirmModal';
import './styles/GlobalContextManager.css';

const GlobalContextManager = () => {
    const {
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
    } = useGlobalVariables();

    const handleChangeField = (id, field, value) => {
        setVariables(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    if (loading) {
        return <div style={{ opacity: 0.5, padding: '1rem' }}>Carregando variáveis...</div>;
    }

    return (
        <div className="global-context-card fade-in">
            <GlobalContextCardHeader onAddVariable={() => setIsAdding(true)} />

            <GlobalVariablesList
                variables={variables}
                saving={saving}
                onUpdate={handleUpdate}
                onEditRequest={setEditingVar}
                onDeleteRequest={setDeleteVar}
                onChangeField={handleChangeField}
            />

            <AddVariableModal
                isOpen={isAdding}
                newVar={newVar}
                setNewVar={setNewVar}
                onClose={() => setIsAdding(false)}
                onCreate={handleCreate}
            />

            <EditVariableModal
                isOpen={!!editingVar}
                variable={editingVar}
                onClose={() => setEditingVar(null)}
                onSave={handleSaveEdit}
                saving={!!saving}
            />

            <ConfirmModal
                isOpen={!!deleteVar}
                title="Remover Variável"
                message={`Deseja realmente excluir "${deleteVar?.key}"?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteVar(null)}
                confirmText="Excluir"
                type="danger"
            />
        </div>
    );
};

export default GlobalContextManager;

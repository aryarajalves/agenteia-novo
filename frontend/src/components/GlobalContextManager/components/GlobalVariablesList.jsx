import React from 'react';
import GlobalVariableCard from './GlobalVariableCard';

export default function GlobalVariablesList({
    variables,
    saving,
    onUpdate,
    onDeleteRequest,
    onChangeField
}) {
    const visibleVariables = variables.filter(v => !v.key.startsWith('PUBLIC_ACCESS_TOKEN_'));

    return (
        <div className="vars-list">
            {visibleVariables.map(v => (
                <GlobalVariableCard
                    key={v.id}
                    variable={v}
                    saving={saving}
                    onUpdate={onUpdate}
                    onDeleteRequest={onDeleteRequest}
                    onChangeField={onChangeField}
                />
            ))}
        </div>
    );
}

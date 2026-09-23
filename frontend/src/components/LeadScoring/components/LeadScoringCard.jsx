import React from 'react';
import LeadScoringCardHeader from './LeadScoringCardHeader';
import LeadScoringCardDetails from './LeadScoringCardDetails';

const LeadScoringCard = ({
    lead,
    isExpanded,
    isRecalculating,
    isDeleting,
    onToggleExpand,
    onRecalculate,
    onRequestDelete
}) => {
    const leadUniqueId = `${lead.leads_table}_${lead.id}`;

    return (
        <div className="lead-card">
            <LeadScoringCardHeader
                lead={lead}
                leadUniqueId={leadUniqueId}
                isExpanded={isExpanded}
                isDeleting={isDeleting}
                onToggleExpand={onToggleExpand}
                onRequestDelete={onRequestDelete}
            />

            {isExpanded && (
                <LeadScoringCardDetails
                    lead={lead}
                    isRecalculating={isRecalculating}
                    onRecalculate={onRecalculate}
                />
            )}
        </div>
    );
};

export default LeadScoringCard;

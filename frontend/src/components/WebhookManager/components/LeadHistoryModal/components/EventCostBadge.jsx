import React from 'react';
import { getEventCostInfo } from '../../../utils/costUtils';

export const EventCostBadge = ({ event, compact = false, style = {} }) => {
    const info = getEventCostInfo(event);

    if (info.badgeType === 'none') {
        return null;
    }

    let bg = 'rgba(99, 102, 241, 0.15)';
    let border = 'rgba(99, 102, 241, 0.35)';
    let color = '#a5b4fc';

    if (info.badgeType === 'zapvoice_import') {
        bg = 'rgba(99, 102, 241, 0.2)';
        border = 'rgba(99, 102, 241, 0.45)';
        color = '#a5b4fc';
    } else if (info.badgeType === 'cache' || info.badgeType === 'shortcut' || info.badgeType === 'free') {
        bg = 'rgba(16, 185, 129, 0.2)';
        border = 'rgba(16, 185, 129, 0.45)';
        color = '#34d399';
    } else if (info.badgeType === 'partial') {
        bg = 'rgba(245, 158, 11, 0.2)';
        border = 'rgba(245, 158, 11, 0.45)';
        color = '#fbbf24';
    } else if (info.badgeType === 'followup') {
        bg = 'rgba(168, 85, 247, 0.2)';
        border = 'rgba(168, 85, 247, 0.45)';
        color = '#c084fc';
    } else if (info.badgeType === 'template') {
        bg = 'rgba(99, 102, 241, 0.2)';
        border = 'rgba(99, 102, 241, 0.45)';
        color = '#a5b4fc';
    }

    const textToDisplay = compact ? info.shortLabel : info.label;

    return (
        <span
            data-testid={`cost-badge-${event?.id || 'item'}`}
            title={`Status Financeiro: ${info.label}`}
            style={{
                fontSize: compact ? '0.62rem' : '0.68rem',
                fontWeight: 800,
                background: bg,
                color,
                border: `1px solid ${border}`,
                padding: compact ? '2px 6px' : '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                lineHeight: 1.3,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                ...style
            }}
        >
            {textToDisplay}
        </span>
    );
};

export default EventCostBadge;

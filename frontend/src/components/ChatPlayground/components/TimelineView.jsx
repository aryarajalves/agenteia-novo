import React from 'react';
import { buildTimelineSteps, TimelineStepItem } from './TimelineViewModules';

const TimelineView = ({ debug, onOpenPreRouterDecision, onOpenPreRouterPrompt }) => {
    if (!debug) return null;

    const steps = buildTimelineSteps(debug, onOpenPreRouterDecision, onOpenPreRouterPrompt);

    return (
        <div className="timeline-container">
            {steps.map((step, i) => (
                <TimelineStepItem
                    key={i}
                    step={step}
                    onOpenPreRouterDecision={onOpenPreRouterDecision}
                    onOpenPreRouterPrompt={onOpenPreRouterPrompt}
                />
            ))}
        </div>
    );
};

export default TimelineView;

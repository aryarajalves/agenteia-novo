import React from 'react';

export default function LivePreviewSection({ snippet = '' }) {
    return (
        <div className="realtime-preview-card">
            <div className="preview-header">
                <span>👀 Preview em Tempo Real</span>
                <span className="preview-glow-dot"></span>
            </div>
            <pre className="preview-code-glow">{snippet}</pre>
        </div>
    );
}

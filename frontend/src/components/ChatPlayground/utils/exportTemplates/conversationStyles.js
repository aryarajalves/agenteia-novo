export const conversationStyles = `
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            --primary: #6366f1;
            --primary-light: #818cf8;
            --user-bg: rgba(99, 102, 241, 0.15);
            --user-border: rgba(99, 102, 241, 0.4);
            --agent-bg: rgba(15, 23, 42, 0.9);
            --agent-border: rgba(255, 255, 255, 0.1);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            padding: 32px 16px;
            display: flex;
            justify-content: center;
        }

        .container {
            width: 100%;
            max-width: 860px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Top Header */
        .page-header {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .agent-title {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .agent-avatar-big {
            font-size: 2rem;
            background: rgba(99, 102, 241, 0.2);
            border: 1px solid var(--primary);
            border-radius: 12px;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .agent-info h1 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #ffffff;
        }

        .agent-info p {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .meta-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .meta-tag {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 0.8rem;
            color: #cbd5e1;
            font-weight: 500;
        }

        /* Conversation List */
        .chat-timeline {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message-card {
            border-radius: 14px;
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s ease;
        }

        .message-card.user-msg {
            background: var(--user-bg);
            border: 1px solid var(--user-border);
            border-left: 4px solid var(--primary-light);
        }

        .message-card.agent-msg {
            background: var(--agent-bg);
            border: 1px solid var(--agent-border);
            border-left: 4px solid #10b981;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .author-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .avatar-badge {
            font-size: 1.1rem;
        }

        .author-name {
            color: #ffffff;
            font-weight: 700;
            font-size: 0.95rem;
        }

        .user-msg .author-name {
            color: #a5b4fc;
        }

        .agent-msg .author-name {
            color: #6ee7b7;
        }

        .message-meta-tag {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .message-content {
            font-size: 0.96rem;
            color: #f8fafc;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .msg-metrics {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 4px;
        }

        .metric-pill {
            font-size: 0.72rem;
            padding: 3px 8px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-muted);
        }

        .metric-pill.cost {
            color: #fbbf24;
            background: rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.2);
        }

        .metric-pill.model {
            color: #a5b4fc;
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.2);
        }

        /* Footer */
        .page-footer {
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
            padding: 20px;
            border-top: 1px solid var(--border-color);
            margin-top: 10px;
        }

        @media print {
            body {
                background: #ffffff;
                color: #000000;
                padding: 0;
            }
            .page-header, .message-card {
                background: #ffffff !important;
                color: #000000 !important;
                border: 1px solid #cccccc !important;
                box-shadow: none !important;
            }
            .message-content, .author-name, .agent-info h1 {
                color: #000000 !important;
            }
        }
`;


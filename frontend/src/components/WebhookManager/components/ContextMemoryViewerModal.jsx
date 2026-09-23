import React, { useState, useMemo } from 'react';
import { showToast } from '../utils/helpers';
import {
    ContextMemoryHeader,
    ContextMemoryToolbar,
    ContextMemoryMessageList,
    ContextMemoryFooter
} from './ContextMemoryViewer';

export default function ContextMemoryViewerModal({ step, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'user', 'assistant'
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState(null);

    if (!step) return null;

    const messages = useMemo(() => {
        if (Array.isArray(step.metadata?.messages)) {
            return step.metadata.messages;
        }
        return [];
    }, [step]);

    const totalMessages = step.metadata?.total_messages || messages.length;
    const numInteractions = step.metadata?.num_interactions || Math.ceil(totalMessages / 2);
    const contextWindow = step.metadata?.context_window || 5;

    const filteredMessages = useMemo(() => {
        return messages.filter((msg, idx) => {
            const role = (msg.role || '').toLowerCase();
            const content = (msg.content || '').toLowerCase();
            
            if (roleFilter === 'user' && role !== 'user') return false;
            if (roleFilter === 'assistant' && role !== 'assistant') return false;
            
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return content.includes(term) || role.includes(term) || String(idx + 1).includes(term);
            }
            return true;
        });
    }, [messages, roleFilter, searchTerm]);

    const userCount = useMemo(() => messages.filter(m => (m.role || '').toLowerCase() === 'user').length, [messages]);
    const assistantCount = useMemo(() => messages.filter(m => (m.role || '').toLowerCase() === 'assistant').length, [messages]);

    const handleCopyAll = () => {
        if (!messages.length) return;
        const text = messages.map((m, i) => {
            const roleLabel = m.role === 'user' ? 'Lead / Usuário' : 'Agente / Assistente';
            return `[#${i + 1} - ${roleLabel}]\n${m.content || ''}\n`;
        }).join('\n---\n\n');

        if (navigator?.clipboard?.writeText) {
            Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 2000);
                showToast('Mensagens copiadas para a área de transferência!', 'success');
            }).catch(() => {
                showToast('Erro ao copiar mensagens.', 'error');
            });
        }
    };

    const handleCopyMessage = (content, idx) => {
        if (content && navigator?.clipboard?.writeText) {
            Promise.resolve(navigator.clipboard.writeText(content)).then(() => {
                setCopiedIdx(idx);
                setTimeout(() => setCopiedIdx(null), 2000);
                showToast('Mensagem copiada para a área de transferência!', 'success');
            }).catch(() => {
                showToast('Erro ao copiar mensagem.', 'error');
            });
        }
    };

    return (
        <div 
            id="context-memory-viewer-modal"
            className="fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1200,
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                transition: 'all 0.3s'
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '850px',
                    height: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 50px 100px rgba(0, 0, 0, 0.9), 0 0 40px rgba(168, 85, 247, 0.12)',
                    overflow: 'hidden'
                }}
            >
                <ContextMemoryHeader
                    totalMessages={totalMessages}
                    numInteractions={numInteractions}
                    contextWindow={contextWindow}
                    onClose={onClose}
                />

                <ContextMemoryToolbar
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    messagesCount={messages.length}
                    userCount={userCount}
                    assistantCount={assistantCount}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    copiedAll={copiedAll}
                    onCopyAll={handleCopyAll}
                />

                <ContextMemoryMessageList
                    messages={messages}
                    filteredMessages={filteredMessages}
                    stepContent={step.content}
                    copiedIdx={copiedIdx}
                    onCopyMessage={handleCopyMessage}
                />

                <ContextMemoryFooter onClose={onClose} />
            </div>
        </div>
    );
}

import React from 'react';
import { LabelMultiSelect } from './LabelSelect';

export const DeleteKeywordsSection = ({ 
    keywords, 
    farewellMessage, 
    onMessageChange, 
    inputValue, 
    onInputChange, 
    onAdd, 
    onRemove,
    deleteLabels = [],
    onLabelsChange,
    labelsList = []
}) => (
    <div style={{ background: '#1e293b', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span>🗑️</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#fca5a5', textTransform: 'uppercase' }}>Auto-Deleção por Palavra-Chave</span>
            <span style={{ fontSize: '0.68rem', color: '#fca5a5', background: '#ef444411', border: '1px solid #ef444433', borderRadius: '4px', padding: '1px 6px', fontWeight: 600, marginLeft: 'auto' }}>PERIGOSO</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Se uma dessas palavras for enviada pelo contato, o sistema irá **deletar permanentemente** o lead do banco de dados e enviar a mensagem abaixo.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
                type="text"
                placeholder='Ex: "DELETAR", "REMOVER", "SAIR"'
                value={inputValue}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
                style={{ flex: 1, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.9rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
            <button type="button" onClick={onAdd} style={{ background: '#ef444422', border: '1px solid #ef444444', color: '#fca5a5', borderRadius: '8px', padding: '0.55rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                + Adicionar
            </button>
        </div>

        {Array.isArray(keywords) && keywords.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {keywords.map((kw, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#450a0a', border: '1px solid #991b1b', borderRadius: '20px', padding: '3px 10px 3px 12px', fontSize: '0.8rem', color: '#fca5a5' }}>
                        {kw}
                        <button type="button" onClick={() => onRemove(kw)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, padding: 0, marginLeft: '2px' }}>✕</button>
                    </span>
                ))}
            </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>💬 Mensagem de Despedida</label>
            <textarea
                value={farewellMessage}
                onChange={e => onMessageChange(e.target.value)}
                placeholder="Ex: Seus dados foram removidos. Até logo!"
                style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 0.9rem', color: '#fff', fontSize: '0.85rem', outline: 'none', minHeight: '60px', resize: 'vertical' }}
            />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🏷️ Etiquetas padrão ao resetar / deletar contato (ZapVoice)</label>
            <LabelMultiSelect
                selected={deleteLabels || []}
                options={labelsList || []}
                onChange={onLabelsChange}
                accentColor="#818cf8"
                placeholder="Selecione ou digite etiqueta padrão..."
            />
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.35rem 0 0', lineHeight: 1.4 }}>
                Ao resetar a conversa via palavra-chave ou deletar o contato no AgentFlow, todas as etiquetas existentes no ZapVoice serão substituídas por estas etiquetas padrão (ex: robo, whatsapp).
            </p>
        </div>
    </div>
);

export default DeleteKeywordsSection;

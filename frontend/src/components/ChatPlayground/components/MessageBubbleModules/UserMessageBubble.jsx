import React from 'react';

const UserMessageBubble = ({ msg }) => {
    return (
        <div className="message-row user-row">
            <div className="message-bubble user-bubble">
                {msg.image_url && (
                    <div className="message-image-container" style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                        <img
                            src={msg.image_url}
                            alt="Enviada pelo usuário"
                            style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', cursor: 'zoom-in' }}
                            onClick={() => window.open(msg.image_url, '_blank')}
                        />
                    </div>
                )}
                <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                {msg.created_at && (
                    <div className="message-timestamp" data-testid="msg-timestamp" style={{ 
                        fontSize: '0.85rem', 
                        color: '#ffffff', 
                        textAlign: 'right', 
                        marginTop: '8px',
                        fontWeight: '600',
                        opacity: '0.95',
                        letterSpacing: '0.5px'
                    }}>
                        {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
            <div className="avatar user-avatar">👤</div>
        </div>
    );
};

export default UserMessageBubble;

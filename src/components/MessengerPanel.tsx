import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { useAuth } from '../contexts/AuthContext';
import { addSessionComment, subscribeToComments, SessionComment } from '../firebase/firestore';

interface MessengerPanelProps {
  sessionId: string | null;
  visible: boolean;
  onHide: () => void;
}

export default function MessengerPanel({ sessionId, visible, onHide }: MessengerPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SessionComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages
  useEffect(() => {
    if (sessionId && visible) {
      const unsubscribe = subscribeToComments(sessionId, (comments) => {
        setMessages(comments);
        // Auto scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
      
      return () => unsubscribe();
    }
  }, [sessionId, visible]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !sessionId || !user) return;

    setLoading(true);
    try {
      await addSessionComment(sessionId, {
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous',
        content: newMessage.trim()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Otherwise show date
    return date.toLocaleDateString();
  };

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-comments" style={{ fontSize: '1.2rem' }}></i>
          <span>Team Chat</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: '450px', height: '600px' }}
      contentStyle={{
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        height: 'calc(100% - 60px)'
      }}
      headerStyle={{
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        borderBottom: '1px solid #222222'
      }}
    >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%'
      }}>
        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          backgroundColor: '#000000'
        }}>
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#666666'
            }}>
              <i className="pi pi-comments" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}></i>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                No messages yet
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                Start a conversation with your team!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.userId === user?.uid;
              const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId;
              
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                    marginTop: showAvatar ? '0.5rem' : '0.25rem'
                  }}
                >
                  {showAvatar && !isOwnMessage && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#666666',
                      marginBottom: '0.25rem',
                      marginLeft: '0.5rem'
                    }}>
                      {msg.userName}
                    </div>
                  )}
                  
                  <div style={{
                    maxWidth: '75%',
                    padding: '0.75rem 1rem',
                    borderRadius: isOwnMessage ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    backgroundColor: isOwnMessage ? '#ffffff' : '#1a1a1a',
                    color: isOwnMessage ? '#000000' : '#ffffff',
                    fontSize: '0.9rem',
                    wordBreak: 'break-word',
                    border: isOwnMessage ? 'none' : '1px solid #222222',
                    boxShadow: isOwnMessage ? '0 2px 4px rgba(255,255,255,0.1)' : 'none'
                  }}>
                    {msg.content}
                    <div style={{
                      fontSize: '0.7rem',
                      color: isOwnMessage ? '#666666' : '#555555',
                      marginTop: '0.25rem',
                      textAlign: 'right'
                    }}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form 
          onSubmit={handleSendMessage}
          style={{
            padding: '1rem',
            borderTop: '1px solid #222222',
            backgroundColor: '#0a0a0a'
          }}
        >
          {!user ? (
            <div style={{
              textAlign: 'center',
              padding: '0.5rem',
              color: '#666666',
              fontSize: '0.85rem'
            }}>
              Please sign in to send messages
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #222222',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  padding: '0.75rem'
                }}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                icon="pi pi-send"
                type="submit"
                disabled={!newMessage.trim() || loading}
                loading={loading}
                style={{
                  backgroundColor: '#ffffff',
                  border: 'none',
                  color: '#000000',
                  padding: '0.75rem 1.25rem'
                }}
              />
            </div>
          )}
        </form>
      </div>
    </Dialog>
  );
}

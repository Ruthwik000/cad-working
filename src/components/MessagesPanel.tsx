import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Badge } from 'primereact/badge';
import { useAuth } from '../contexts/AuthContext';
import { addSessionComment, subscribeToComments, SessionComment } from '../firebase/firestore';

interface MessagesPanelProps {
  sessionId: string | null;
  visible: boolean;
  onHide: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function MessagesPanel({ sessionId, visible, onHide, onUnreadCountChange }: MessagesPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SessionComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<Toast>(null);

  // Load last read timestamp from localStorage
  useEffect(() => {
    if (sessionId && user) {
      const stored = localStorage.getItem(`lastRead_${sessionId}_${user.uid}`);
      if (stored) {
        setLastReadTimestamp(parseInt(stored));
      }
    }
  }, [sessionId, user]);

  // Subscribe to messages
  useEffect(() => {
    if (sessionId) {
      const unsubscribe = subscribeToComments(sessionId, (comments) => {
        setMessages(comments);
        
        // Calculate unread count
        if (user && lastReadTimestamp) {
          const unreadCount = comments.filter(msg => {
            const msgTime = msg.timestamp?.toMillis ? msg.timestamp.toMillis() : 0;
            return msgTime > lastReadTimestamp && msg.userId !== user.uid;
          }).length;
          
          if (onUnreadCountChange) {
            onUnreadCountChange(unreadCount);
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [sessionId, user, lastReadTimestamp, onUnreadCountChange]);

  // Mark as read when dialog opens
  useEffect(() => {
    if (visible && sessionId && user) {
      const now = Date.now();
      setLastReadTimestamp(now);
      localStorage.setItem(`lastRead_${sessionId}_${user.uid}`, now.toString());
      
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
    }
  }, [visible, sessionId, user, onUnreadCountChange]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (visible) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, visible]);

  const handleSendMessage = async () => {
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
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to send message',
        life: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: any) => {
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
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <>
      <Toast ref={toastRef} />
      
      <Dialog
        header="Team Messages"
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Messages List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#666666'
              }}>
                <i className="pi pi-comments" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  No messages yet
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                  Start a conversation with your team
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
                      alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {showAvatar && !isOwnMessage && (
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#a0a0a0',
                        marginBottom: '0.25rem',
                        marginLeft: '0.5rem'
                      }}>
                        {msg.userName}
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '0.75rem 1rem',
                        borderRadius: isOwnMessage ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        backgroundColor: isOwnMessage ? '#ffffff' : '#1a1a1a',
                        color: isOwnMessage ? '#000000' : '#ffffff',
                        fontSize: '0.9rem',
                        wordBreak: 'break-word',
                        border: isOwnMessage ? 'none' : '1px solid #222222',
                        boxShadow: isOwnMessage ? '0 2px 8px rgba(255,255,255,0.1)' : 'none'
                      }}
                    >
                      <div style={{ marginBottom: '0.25rem' }}>
                        {msg.content}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: isOwnMessage ? '#666666' : '#888888',
                        textAlign: 'right'
                      }}>
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid #222222',
            backgroundColor: '#0a0a0a'
          }}>
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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <InputText
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
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
                />
                <Button
                  icon="pi pi-send"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  loading={loading}
                  style={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    width: '42px',
                    height: '42px'
                  }}
                  rounded
                />
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

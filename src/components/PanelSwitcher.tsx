// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ToggleButton } from 'primereact/togglebutton';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ModelContext } from './contexts.ts';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from 'primereact/toast';
import { toggleSessionSharing, subscribeToSession, CollaboratorInfo } from '../firebase/firestore';
import MessengerPanel from './MessengerPanel';

export default function PanelSwitcher() {
  const model = useContext(ModelContext);
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { user, logOut } = useAuth();
  const toastRef = React.useRef<Toast>(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [showMessenger, setShowMessenger] = useState(false);
  
  if (!model) throw new Error('No model');

  const state = model.state;

  // Subscribe to collaborators
  useEffect(() => {
    if (sessionId) {
      const unsubscribe = subscribeToSession(sessionId, (session) => {
        if (session && session.collaborators) {
          setCollaborators(session.collaborators);
        }
      });
      
      return () => unsubscribe();
    }
  }, [sessionId]);

  const handleCopyLink = () => {
    // Generate shareable link with current session
    const sessionId = localStorage.getItem('currentSessionId');
    
    if (!sessionId) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'No Active Session',
        detail: 'Create a chat first to share',
        life: 3000
      });
      return;
    }
    
    // Enable sharing for this session
    if (user) {
      toggleSessionSharing(sessionId, true).catch(err => {
        console.error('Error enabling sharing:', err);
      });
    }
    
    const shareUrl = `${window.location.origin}/${sessionId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toastRef.current?.show({
        severity: 'success',
        summary: 'Link Copied!',
        detail: 'Anyone with this link can collaborate',
        life: 3000
      });
    }).catch(() => {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Failed to copy',
        detail: 'Please try again',
        life: 3000
      });
    });
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <Toast ref={toastRef} position="top-right" />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid #222222',
        minHeight: '56px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {/* Back Button */}
          <Button
            icon="pi pi-arrow-left"
            rounded
            text
            onClick={handleBack}
            tooltip="Back to Home"
            tooltipOptions={{ position: 'bottom' }}
            style={{
              color: '#ffffff',
              width: '36px',
              height: '36px'
            }}
          />
          
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.1rem',
            fontWeight: 400,
            color: '#ffffff',
            letterSpacing: '0.5px'
          }}>
            Venus
          </h2>

          {/* New Chat Button */}
          <Button
            icon="pi pi-plus"
            rounded
            text
            onClick={async () => {
              if (user) {
                try {
                  const { createSession } = await import('../firebase/firestore');
                  const sessionId = await createSession(user.uid, 'New Chat');
                  localStorage.setItem('currentSessionId', sessionId);
                  navigate(`/${sessionId}`);
                } catch (error) {
                  console.error('Error creating session:', error);
                  navigate('/new');
                }
              } else {
                navigate('/new');
              }
            }}
            tooltip="New Chat"
            tooltipOptions={{ position: 'bottom' }}
            style={{
              color: '#ffffff',
              width: '36px',
              height: '36px'
            }}
          />
        </div>
        
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {/* Active Collaborators Button */}
          {collaborators.length > 0 && (
            <Button
              icon="pi pi-users"
              label={`${collaborators.length}`}
              onClick={() => setShowCollaborators(true)}
              tooltip="View active collaborators"
              tooltipOptions={{ position: 'bottom' }}
              style={{
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                border: '1px solid #333333',
                padding: '0.5rem 1rem'
              }}
              badge={collaborators.length.toString()}
              badgeClassName="p-badge-success"
            />
          )}
          
          {/* Copy Link Button */}
          <Button
            icon="pi pi-link"
            onClick={handleCopyLink}
            tooltip="Copy shareable link"
            tooltipOptions={{ position: 'bottom' }}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #333333',
              padding: '0.5rem 1rem'
            }}
          />
          
          {/* Messenger Button */}
          <Button
            icon="pi pi-comments"
            onClick={() => setShowMessenger(true)}
            tooltip="Team Chat"
            tooltipOptions={{ position: 'bottom' }}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #333333',
              padding: '0.5rem 1rem'
            }}
          />
          
          <ToggleButton
            checked={state.view.codeEditorVisible ?? false}
            onLabel="Code"
            offLabel="Code"
            onIcon="pi pi-code"
            offIcon="pi pi-code"
            onChange={() => model.toggleCodeEditor()}
            style={{
              backgroundColor: state.view.codeEditorVisible ? '#ffffff' : '#1a1a1a',
              color: state.view.codeEditorVisible ? '#000000' : '#ffffff',
              border: '1px solid #333333',
              padding: '0.5rem 1rem',
              fontWeight: 500
            }}
          />
          
          <ToggleButton
            checked={state.view.aiChatVisible ?? false}
            onLabel="AI Assistant"
            offLabel="AI Assistant"
            onIcon="pi pi-sparkles"
            offIcon="pi pi-sparkles"
            onChange={() => model.toggleAIChat()}
            style={{
              backgroundColor: state.view.aiChatVisible ? '#ffffff' : '#1a1a1a',
              color: state.view.aiChatVisible ? '#000000' : '#ffffff',
              border: '1px solid #333333',
              padding: '0.5rem 1rem',
              fontWeight: 500
            }}
          />
          
          {/* Logout Button */}
          {user && (
            <Button
              icon="pi pi-sign-out"
              onClick={handleLogout}
              tooltip="Sign Out"
              tooltipOptions={{ position: 'bottom' }}
              style={{
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                border: '1px solid #333333',
                padding: '0.5rem 1rem'
              }}
            />
          )}
        </div>
      </div>
      
      {/* Collaborators Dialog */}
      <Dialog
        header={`Active Collaborators (${collaborators.length})`}
        visible={showCollaborators}
        onHide={() => setShowCollaborators(false)}
        style={{ width: '400px' }}
        contentStyle={{
          backgroundColor: '#0a0a0a',
          color: '#ffffff'
        }}
        headerStyle={{
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          borderBottom: '1px solid #222222'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
          {collaborators.map((collab) => (
            <div
              key={collab.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#141414',
                borderRadius: '6px',
                border: `2px solid ${collab.color}`
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: collab.color,
                  animation: 'pulse 2s infinite',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.95rem',
                  color: '#ffffff',
                  fontWeight: 500,
                  marginBottom: '0.25rem'
                }}>
                  {collab.displayName}
                  {collab.userId === user?.uid && (
                    <span style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#666666',
                      fontWeight: 400
                    }}>
                      (You)
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#666666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {collab.email}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.9); }
          }
        `}</style>
      </Dialog>
      
      {/* Messenger Panel */}
      <MessengerPanel 
        sessionId={sessionId || null}
        visible={showMessenger}
        onHide={() => setShowMessenger(false)}
      />
    </>
  );
}

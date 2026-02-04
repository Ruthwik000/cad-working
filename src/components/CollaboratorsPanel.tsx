import React from 'react';
import { CollaboratorInfo } from '../firebase/firestore';

interface CollaboratorsPanelProps {
  collaborators: CollaboratorInfo[];
}

export default function CollaboratorsPanel({ collaborators }: CollaboratorsPanelProps) {
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      backgroundColor: '#0a0a0a',
      border: '1px solid #222222',
      borderRadius: '8px',
      padding: '0.75rem',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{
        fontSize: '0.85rem',
        fontWeight: 500,
        color: '#ffffff',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className="pi pi-users" style={{ fontSize: '0.9rem' }}></i>
        Active Collaborators ({collaborators.length})
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {collaborators.map((collab) => (
          <div
            key={collab.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#141414',
              borderRadius: '4px',
              border: `1px solid ${collab.color}`
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: collab.color,
                animation: 'pulse 2s infinite'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#ffffff',
                fontWeight: 500
              }}>
                {collab.displayName}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#666666'
              }}>
                {collab.email}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

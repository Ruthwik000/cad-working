// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { useContext } from 'react';
import { ToggleButton } from 'primereact/togglebutton';
import { ModelContext } from './contexts.ts';

export default function PanelSwitcher() {
  const model = useContext(ModelContext);
  if (!model) throw new Error('No model');

  const state = model.state;

  return (
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
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.1rem',
          fontWeight: 400,
          color: '#ffffff',
          letterSpacing: '0.5px'
        }}>
          VenusCAD
        </h2>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
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
      </div>
    </div>
  );
}

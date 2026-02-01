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
      padding: '0.5rem 1rem',
      backgroundColor: 'var(--surface-card)',
      borderBottom: '1px solid var(--surface-border)',
      minHeight: '50px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.2rem',
          fontWeight: 600 
        }}>
          OpenSCAD Playground
        </h2>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        <ToggleButton
          checked={state.view.aiChatVisible ?? false}
          onLabel="AI Assistant"
          offLabel="AI Assistant"
          onIcon="pi pi-sparkles"
          offIcon="pi pi-sparkles"
          onChange={() => model.toggleAIChat()}
          />
      </div>
    </div>
  );
}

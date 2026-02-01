// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { CSSProperties, useEffect, useState } from 'react';
import {MultiLayoutComponentId, State, StatePersister} from '../state/app-state'
import { Model } from '../state/model';
import EditorPanel from './EditorPanel';
import ViewerPanel from './ViewerPanel';
import Footer from './Footer';
import { ModelContext, FSContext } from './contexts';
import PanelSwitcher from './PanelSwitcher';
import { ConfirmDialog } from 'primereact/confirmdialog';
import CustomizerPanel from './CustomizerPanel';
import AIChatPanel from './AIChatPanel';


export function App({initialState, statePersister, fs}: {initialState: State, statePersister: StatePersister, fs: FS}) {
  const [state, setState] = useState(initialState);
  
  const model = new Model(fs, state, setState, statePersister);
  useEffect(() => model.init());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        model.render({isPreview: true, now: true})
      } else if (event.key === 'F6') {
        event.preventDefault();
        model.render({isPreview: false, now: true})
      } else if (event.key === 'F7') {
        event.preventDefault();
        model.export();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ModelContext.Provider value={model}>
      <FSContext.Provider value={fs}>
        {/* VS Code-like Layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}>
          {/* Top Header */}
          <PanelSwitcher />

          {/* Main Content Area */}
          <div style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden'
          }}>
            {/* Left Sidebar - Properties/Customizer */}
            <div style={{
              width: '300px',
              borderRight: '1px solid var(--surface-border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface-ground)'
            }}>
              <CustomizerPanel 
                className=""
                style={{ flex: 1, display: 'flex' }} 
              />
            </div>

            {/* Center Area - Editor + Viewer */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Top: 3D Preview */}
              <div style={{
                height: '50%',
                borderBottom: '1px solid var(--surface-border)',
                display: 'flex'
              }}>
                <ViewerPanel 
                  className=""
                  style={{ flex: 1, display: 'flex' }} 
                />
              </div>

              {/* Bottom: Code Editor */}
              <div style={{
                height: '50%',
                display: 'flex'
              }}>
                <EditorPanel 
                  className=""
                  style={{ flex: 1, display: 'flex' }} 
                />
              </div>
            </div>

            {/* Right Sidebar - AI Chat */}
            {state.view.aiChatVisible && (
              <div style={{
                width: '400px',
                borderLeft: '1px solid var(--surface-border)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--surface-ground)'
              }}>
                <AIChatPanel 
                  visible={true} 
                  onClose={() => model.toggleAIChat()} 
                />
              </div>
            )}
          </div>

          {/* Bottom Footer */}
          <Footer />
          <ConfirmDialog />
        </div>
      </FSContext.Provider>
    </ModelContext.Provider>
  );
}

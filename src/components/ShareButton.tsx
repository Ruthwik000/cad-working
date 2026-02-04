import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { generateShareToken } from '../firebase/firestore';

interface ShareButtonProps {
  sessionId: string | null;
}

export default function ShareButton({ sessionId }: ShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const toastRef = React.useRef<Toast>(null);

  const handleShare = async () => {
    if (!sessionId) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'No Session',
        detail: 'Please save your work first',
        life: 3000
      });
      return;
    }

    setLoading(true);
    try {
      const token = await generateShareToken(sessionId);
      const link = `${window.location.origin}/${token}`;
      setShareLink(link);
      setShowDialog(true);
    } catch (error) {
      console.error('Error generating share link:', error);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to generate share link',
        life: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toastRef.current?.show({
      severity: 'success',
      summary: 'Copied!',
      detail: 'Share link copied to clipboard',
      life: 2000
    });
  };

  return (
    <>
      <Toast ref={toastRef} />
      
      <Button
        icon="pi pi-share-alt"
        label="Share"
        onClick={handleShare}
        loading={loading}
        outlined
        style={{
          backgroundColor: 'transparent',
          border: '1px solid #333333',
          color: '#ffffff'
        }}
      />

      <Dialog
        header="Share Session"
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        style={{ width: '500px' }}
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
        <div style={{ padding: '1rem 0' }}>
          <p style={{ marginBottom: '1rem', color: '#a0a0a0' }}>
            Anyone with this link can view and collaborate on this session in real-time.
          </p>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <InputText
              value={shareLink}
              readOnly
              style={{
                flex: 1,
                backgroundColor: '#0f0f0f',
                border: '1px solid #222222',
                color: '#ffffff'
              }}
            />
            <Button
              icon="pi pi-copy"
              onClick={copyToClipboard}
              tooltip="Copy to clipboard"
              style={{
                backgroundColor: '#ffffff',
                border: 'none',
                color: '#000000'
              }}
            />
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: '4px'
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666666' }}>
              <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }}></i>
              Collaborators will see live updates to code, messages, and 3D models.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}

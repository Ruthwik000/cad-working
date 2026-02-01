import React, { useState, useRef, useEffect, useContext } from 'react';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ModelContext } from './contexts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const model = useContext(ModelContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowApiKeyInput(false);
  };

  const generateOpenSCAD = async (prompt: string) => {
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    setLoading(true);
    const userMessage: Message = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert OpenSCAD code generator. Your task is to generate highly realistic, detailed, and functional OpenSCAD code based on user requests.

CRITICAL RULES:
1. Generate ONLY valid OpenSCAD code - no explanations, no markdown, no comments outside the code
2. Make models as realistic and detailed as possible
3. Use proper dimensions and proportions
4. Include appropriate modules and functions for reusability
5. Use transformations (translate, rotate, scale) effectively
6. Add realistic details like rounded edges, proper curves, and fine features
7. Use variables for easy customization
8. Ensure the code is production-ready and will render without errors

User request: ${prompt}

Generate the OpenSCAD code now:`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      
      // Extract code from markdown if present
      let code = generatedText;
      const codeBlockMatch = generatedText.match(/```(?:openscad)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        code = codeBlockMatch[1];
      }

      const assistantMessage: Message = { role: 'assistant', content: code };
      setMessages(prev => [...prev, assistantMessage]);

      // Insert the generated code into the editor
      if (model) {
        model.setSource(code);
      }

    } catch (error) {
      console.error('Error generating code:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate code. Please check your API key and try again.'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      generateOpenSCAD(input.trim());
      setInput('');
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: '400px',
      backgroundColor: 'var(--surface-ground)',
      borderRight: '1px solid var(--surface-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--surface-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--surface-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-sparkles" style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}></i>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>AI Assistant</h3>
        </div>
        <Button
          icon="pi pi-times"
          rounded
          text
          severity="secondary"
          onClick={onClose}
        />
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--yellow-50)',
          borderBottom: '1px solid var(--surface-border)'
        }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
            Gemini API Key
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <InputTextarea
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              rows={2}
              style={{ flex: 1, fontSize: '0.85rem' }}
            />
            <Button
              icon="pi pi-check"
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
            />
          </div>
          <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-color-secondary)' }}>
            Get your API key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
              Google AI Studio
            </a>
          </small>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-color-secondary)',
            padding: '2rem 1rem'
          }}>
            <i className="pi pi-sparkles" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Ask me to generate any 3D model!
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
              Try: "Create a realistic car", "Generate a horse", "Make a wheel"
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--surface-card)',
              color: msg.role === 'user' ? 'white' : 'var(--text-color)',
              fontSize: '0.9rem',
              wordBreak: 'break-word',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              {msg.role === 'assistant' && msg.content.includes('Error:') ? (
                <span style={{ color: 'var(--red-500)' }}>{msg.content}</span>
              ) : msg.role === 'assistant' ? (
                <pre style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </pre>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ProgressSpinner style={{ width: '30px', height: '30px' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
              Generating code...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '1rem',
        borderTop: '1px solid var(--surface-border)',
        backgroundColor: 'var(--surface-card)'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <InputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to create..."
            rows={2}
            style={{ flex: 1 }}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            icon="pi pi-send"
            type="submit"
            disabled={!input.trim() || loading}
            style={{ alignSelf: 'flex-end' }}
          />
        </div>
        <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-color-secondary)' }}>
          Press Enter to send, Shift+Enter for new line
        </small>
      </form>
    </div>
  );
}

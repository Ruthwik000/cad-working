import React, { useState, useRef, useEffect, useContext } from 'react';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ModelContext } from './contexts';
import { useAuth } from '../contexts/AuthContext';
import { addMessageToSession, updateSession, getSession } from '../firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // base64 encoded image
}

export default function AIChatPanel({ visible, onClose, initialPrompt }: { visible: boolean; onClose: () => void; initialPrompt?: string | null }) {
  const model = useContext(ModelContext);
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasProcessedInitialPrompt = useRef(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowApiKeyInput(true);
    }

    // Get current session ID from localStorage
    const sessionId = localStorage.getItem('currentSessionId');
    if (sessionId) {
      setCurrentSessionId(sessionId);
      loadSessionMessages(sessionId);
    } else {
      // Clear messages for new chat
      setMessages([]);
      setCurrentSessionId(null);
    }
    
    // Check for initial prompt from landing page (for new sessions)
    const initialPromptFromStorage = localStorage.getItem('initialPrompt');
    if (initialPromptFromStorage) {
      console.log('📝 Loading initial prompt into input box:', initialPromptFromStorage);
      setInput(initialPromptFromStorage);
      localStorage.removeItem('initialPrompt');
    }
  }, []);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const session = await getSession(sessionId);
      if (session && session.messages && session.messages.length > 0) {
        // Convert Firestore messages to local Message format
        const loadedMessages: Message[] = session.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          image: msg.image
        }));
        
        // Check if the last message is from user and needs a response
        const lastMessage = loadedMessages[loadedMessages.length - 1];
        const hasInitialPrompt = localStorage.getItem('initialPrompt');
        
        // Check if this is a new session with initial prompt
        const isNewSessionWithPrompt = loadedMessages.length === 1 && lastMessage.role === 'user' && hasInitialPrompt;
        
        if (isNewSessionWithPrompt) {
          // Don't add the message to chat, put it in the input box instead
          console.log('� Loading initial prompt into input box:l', lastMessage.content);
          setInput(lastMessage.content);
          setMessages([]); // Start with empty chat
          localStorage.removeItem('initialPrompt');
          
          // Delete the message from Firestore since we're not using it yet
          // The user will send it manually
          if (currentSessionId) {
            try {
              await updateSession(currentSessionId, { messages: [] });
            } catch (error) {
              console.error('Error clearing initial message:', error);
            }
          }
          return; // Exit early
        }
        
        // Normal case - just load the messages
        setMessages(loadedMessages);
        
        // Load the model code if available
        if (session.modelCode && model) {
          model.setSource(session.modelCode);
          
          // First check syntax to extract parameters
          console.log('Checking syntax to extract parameters from loaded session...');
          try {
            await model.checkSyntax();
            console.log('Syntax check completed - parameters extracted');
          } catch (error) {
            console.error('Syntax check failed:', error);
          }
          
          // Trigger render after code is loaded with retry logic
          const attemptRender = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`Auto-rendering loaded session code (attempt ${i + 1}/${retries})...`);
                await model.render({ isPreview: true, now: true });
                console.log('Render successful!');
                break;
              } catch (error) {
                console.error(`Render attempt ${i + 1} failed:`, error);
                if (i < retries - 1) {
                  // Wait longer between retries
                  await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                }
              }
            }
          };
          
          setTimeout(() => attemptRender(), 2000);
        }
      } else {
        // New empty session - clear messages
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
      setMessages([]);
    }
  };

  // Handle initial prompt from landing page
  useEffect(() => {
    if (initialPrompt && !hasProcessedInitialPrompt.current && visible) {
      hasProcessedInitialPrompt.current = true;
      
      if (!apiKey) {
        setShowApiKeyInput(true);
        setInput(initialPrompt);
        return;
      }
      
      // Automatically send the prompt
      generateOpenSCAD(initialPrompt);
    }
  }, [initialPrompt, visible, apiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowApiKeyInput(false);
    
    if (input.trim()) {
      setTimeout(() => {
        generateOpenSCAD(input.trim(), selectedImage || undefined);
        setInput('');
        setSelectedImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateOpenSCAD = async (prompt: string, imageData?: string, skipUserMessage: boolean = false) => {
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    setLoading(true);
    
    // Only add user message if not skipping (i.e., not already in Firestore)
    if (!skipUserMessage) {
      const userMessage: Message = { role: 'user', content: prompt, image: imageData };
      setMessages(prev => [...prev, userMessage]);

      // Save user message to Firestore if user is logged in
      if (user && currentSessionId) {
        try {
          await addMessageToSession(currentSessionId, {
            role: 'user',
            content: prompt,
            image: imageData
          });
        } catch (error) {
          console.error('Error saving user message:', error);
        }
      }
    } else {
      // If skipping, we still need to show the user message in UI
      const userMessage: Message = { role: 'user', content: prompt, image: imageData };
      setMessages(prev => [...prev, userMessage]);
    }

    try {
      // Get current code from editor
      const currentCode = model?.source || '';
      const hasExistingCode = currentCode.trim().length > 0;

      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Add current user message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      // Create system prompt based on whether we're editing or creating
      const systemPrompt = hasExistingCode
        ? `You are an expert OpenSCAD code editor. The user has existing OpenSCAD code and wants to modify it.

CURRENT CODE:
\`\`\`openscad
${currentCode}
\`\`\`

CRITICAL RULES:
1. Generate ONLY the complete modified OpenSCAD code - no explanations, no markdown formatting, no comments outside the code
2. Keep all existing functionality unless specifically asked to change it
3. Make the requested modifications while maintaining code quality
4. Preserve variable names and module structure when possible
5. Add realistic details and proper proportions for new elements
6. Ensure the modified code will render without errors
7. If adding new features, integrate them seamlessly with existing code
8. ALWAYS include OpenSCAD Customizer parameters for key dimensions and features using special comments
9. Format parameters like: /* [Section Name] */ followed by variable = value; // [min:max] or // [option1, option2]
${imageData ? '10. If an image is provided, analyze it and incorporate its features into the 3D model' : ''}

CUSTOMIZER PARAMETER EXAMPLE:
/* [Basic Parameters] */
// Radius of the object
radius = 10; // [5:50]
// Height of the object
height = 20; // [10:100]

User's modification request: ${prompt}

Generate the complete modified OpenSCAD code now (just the code, nothing else):`
        : `You are an expert OpenSCAD code generator. Your task is to generate highly realistic, detailed, and functional OpenSCAD code based on user requests.

CRITICAL RULES:
1. Generate ONLY valid OpenSCAD code - no explanations, no markdown formatting, no comments outside the code
2. Make models as realistic and detailed as possible
3. Use proper dimensions and proportions
4. Include appropriate modules and functions for reusability
5. Use transformations (translate, rotate, scale) effectively
6. Add realistic details like rounded edges, proper curves, and fine features
7. Use variables for easy customization
8. Ensure the code is production-ready and will render without errors
9. ALWAYS include OpenSCAD Customizer parameters for key dimensions and features using special comments
10. Format parameters like: /* [Section Name] */ followed by variable = value; // [min:max] or // [option1, option2]
${imageData ? '11. If an image is provided, analyze it carefully and create a 3D model that matches its shape, proportions, and features' : ''}

CUSTOMIZER PARAMETER EXAMPLE:
/* [Basic Parameters] */
// Radius of the object
radius = 10; // [5:50]
// Height of the object
height = 20; // [10:100]
// Number of sides
sides = 6; // [3:12]

/* [Advanced] */
// Enable feature
enable_feature = true;

User request: ${prompt}

Generate the OpenSCAD code now (just the code, nothing else):`;

      // Build request parts
      const requestParts: any[] = [{ text: systemPrompt }];
      
      let generatedText = '';

      // Use Groq for image-to-3D, Gemini for text prompts
      if (imageData) {
        // Use Groq for image-to-3D conversion
        const groqKey = process.env.REACT_APP_GROQ_API_KEY;
        
        if (!groqKey) {
          throw new Error('Groq API key not configured. Please add REACT_APP_GROQ_API_KEY to your .env file.');
        }

        console.log('🚀 Using Groq API for image-to-3D...');
        
        const groqMessages: any[] = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.parts[0].text
          })),
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ];

        const groqResponse = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.2-90b-vision-preview',
              messages: groqMessages,
              temperature: 0.7,
              max_tokens: 8192,
            })
          }
        );

        if (!groqResponse.ok) {
          const errorText = await groqResponse.text();
          throw new Error(`Groq API Error: ${groqResponse.status} - ${groqResponse.statusText}. ${errorText}`);
        }

        const groqData = await groqResponse.json();
        generatedText = groqData.choices?.[0]?.message?.content || '';
        console.log('✅ Groq API succeeded');
      } else {
        // Use Gemini for text-only prompts
        console.log('🚀 Using Gemini API for text prompt...');
        
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
                  parts: requestParts
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
          const errorText = await response.text();
          throw new Error(`Gemini API Error: ${response.status} - ${response.statusText}. ${errorText}. Try using a different API key or wait a few minutes if you hit rate limits.`);
        }

        const data = await response.json();
        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        console.log('✅ Gemini API succeeded');
      }
      
      // Extract code from markdown if present
      let code = generatedText;
      const codeBlockMatch = generatedText.match(/```(?:openscad)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        code = codeBlockMatch[1];
      }

      const assistantMessage: Message = { role: 'assistant', content: code };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to Firestore if user is logged in
      if (user && currentSessionId) {
        try {
          await addMessageToSession(currentSessionId, {
            role: 'assistant',
            content: code
          });
          
          // Also update the model code in the session
          await updateSession(currentSessionId, {
            modelCode: code
          });
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }

      // Insert the generated code into the editor
      if (model) {
        model.setSource(code);
        
        // First check syntax to extract parameters
        console.log('Checking syntax to extract parameters...');
        try {
          await model.checkSyntax();
          console.log('Syntax check completed - parameters extracted');
        } catch (error) {
          console.error('Syntax check failed:', error);
        }
        
        // Then automatically render after code is generated with retry logic
        const attemptRender = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              console.log(`Auto-rendering AI generated code (attempt ${i + 1}/${retries})...`);
              await model.render({ isPreview: true, now: true });
              console.log('Render successful!');
              break;
            } catch (error) {
              console.error(`Render attempt ${i + 1} failed:`, error);
              if (i < retries - 1) {
                // Wait longer between retries
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
              }
            }
          }
        };
        
        // Wait a bit for the code to be set, then render
        setTimeout(() => attemptRender(), 1000);
      }

    } catch (error) {
      console.error('Error generating code:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate code. Please check your API key and try again.'}`
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message to Firestore if user is logged in
      if (user && currentSessionId) {
        try {
          await addMessageToSession(currentSessionId, {
            role: 'assistant',
            content: errorMessage.content
          });
        } catch (firestoreError) {
          console.error('Error saving error message:', firestoreError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      generateOpenSCAD(input.trim(), selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0a0a0a'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #222222',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <i className="pi pi-sparkles" style={{ fontSize: '1.2rem', color: '#ffffff' }}></i>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: '#ffffff' }}>AI Assistant</h3>
            {model?.source?.trim() && (
              <small style={{ color: '#666666', fontSize: '0.75rem' }}>
                Edit mode - I can modify your current model
              </small>
            )}
          </div>
        </div>
        <Button
          icon="pi pi-times"
          rounded
          text
          severity="secondary"
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff'
          }}
        />
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#141414',
          borderBottom: '1px solid #222222'
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
              style={{ 
                flex: 1, 
                fontSize: '0.85rem',
                backgroundColor: '#0f0f0f',
                border: '1px solid #222222',
                color: '#ffffff'
              }}
            />
            <Button
              icon="pi pi-check"
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333333',
                color: '#ffffff'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '0.5rem', color: '#666666' }}>
            Get your API key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff' }}>
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
        gap: '1rem',
        backgroundColor: '#000000'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666666',
            padding: '2rem 1rem'
          }}>
            <i className="pi pi-sparkles" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2, color: '#ffffff' }}></i>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#a0a0a0' }}>
              Ask me to generate or edit 3D models!
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666666' }}>
              Create: "Make a realistic car"<br />
              Edit: "Make the headlights round" or "Add a spare tire"
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
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: msg.role === 'user' ? '#ffffff' : '#141414',
              color: msg.role === 'user' ? '#000000' : '#ffffff',
              fontSize: '0.9rem',
              wordBreak: 'break-word',
              border: msg.role === 'user' ? 'none' : '1px solid #222222'
            }}>
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Uploaded" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }} 
                />
              )}
              {msg.role === 'assistant' && msg.content.includes('Error:') ? (
                <span style={{ color: '#ff6b6b' }}>{msg.content}</span>
              ) : msg.role === 'assistant' ? (
                <pre style={{
                  margin: 0,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#ffffff'
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
            <span style={{ fontSize: '0.9rem', color: '#666666' }}>
              Generating code...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid #222222',
        backgroundColor: '#0a0a0a'
      }}>
        {selectedImage && (
          <div style={{
            marginBottom: '0.5rem',
            position: 'relative',
            display: 'inline-block'
          }}>
            <img 
              src={selectedImage} 
              alt="Selected" 
              style={{ 
                maxWidth: '150px', 
                maxHeight: '150px', 
                borderRadius: '4px',
                border: '1px solid #222222'
              }} 
            />
            <Button
              icon="pi pi-times"
              rounded
              text
              severity="danger"
              onClick={removeImage}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                minWidth: '24px',
                backgroundColor: '#ff6b6b',
                color: '#ffffff'
              }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <Button
            icon="pi pi-image"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            tooltip="Upload image"
            tooltipOptions={{ position: 'top' }}
            style={{ 
              alignSelf: 'flex-end',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              color: '#ffffff'
            }}
          />
          <InputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={model?.source?.trim() ? "Ask me to modify the current model..." : "Describe what you want to create..."}
            rows={2}
            style={{ 
              flex: 1,
              backgroundColor: '#0f0f0f',
              border: '1px solid #222222',
              color: '#ffffff',
              fontSize: '0.9rem'
            }}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSelectedImage(reader.result as string);
                      };
                      reader.readAsDataURL(blob);
                    }
                    break;
                  }
                }
              }
            }}
          />
          <Button
            icon="pi pi-send"
            type="submit"
            disabled={!input.trim() || loading}
            style={{ 
              alignSelf: 'flex-end',
              backgroundColor: '#ffffff',
              border: 'none',
              color: '#000000'
            }}
          />
        </div>
        <small style={{ display: 'block', marginTop: '0.5rem', color: '#666666', fontSize: '0.8rem' }}>
          Press Enter to send, Shift+Enter for new line, Ctrl+V to paste images
        </small>
      </form>
    </div>
  );
}

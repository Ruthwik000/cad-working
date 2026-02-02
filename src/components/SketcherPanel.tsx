import React, { useState, useContext } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ModelContext } from './contexts';

interface SketchView {
  name: string;
  svg: string;
  dimensions: { label: string; value: string }[];
}

export default function SketcherPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const model = useContext(ModelContext);
  const [sketches, setSketches] = useState<SketchView[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSketches = async () => {
    const apiKey = process.env.REACT_APP_SKETCHER_API_KEY;
    
    console.log('API Key from env:', apiKey); // Debug log
    console.log('All env vars:', process.env); // Debug log
    
    if (!apiKey || apiKey === 'your_groq_sketcher_api_key_here') {
      alert('Please set REACT_APP_SKETCHER_API_KEY in your .env file and restart the dev server');
      return;
    }

    const currentCode = model?.source || '';
    if (!currentCode.trim()) {
      alert('No OpenSCAD code to analyze. Please create a model first.');
      return;
    }

    setLoading(true);
    setSketches([]);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            {
              role: 'system',
              content: `You are a technical drawing expert. You MUST respond with ONLY valid JSON, no other text.

Generate 2D orthographic projection views (Top, Front, Side) with dimensions in SVG format.

CRITICAL RULES:
1. Generate exactly 3 views: Top View, Front View, and Side View (Right)
2. Each view shows the complete 3D model as a 2D projection
3. Include dimension lines with accurate measurements
4. Respond with ONLY this JSON structure (no markdown, no explanations):

{
  "sketches": [
    {
      "name": "Top View",
      "svg": "<svg width='400' height='400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect x='100' y='100' width='200' height='200' fill='none' stroke='#000' stroke-width='2'/><line x1='50' y1='100' x2='350' y2='100' stroke='#666' stroke-width='1'/><text x='200' y='80' text-anchor='middle' font-size='12'>200mm</text></svg>",
      "dimensions": [
        {"label": "Width", "value": "200mm"},
        {"label": "Depth", "value": "200mm"}
      ]
    },
    {
      "name": "Front View",
      "svg": "<svg width='400' height='400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect x='100' y='100' width='200' height='200' fill='none' stroke='#000' stroke-width='2'/></svg>",
      "dimensions": [
        {"label": "Width", "value": "200mm"},
        {"label": "Height", "value": "200mm"}
      ]
    },
    {
      "name": "Side View (Right)",
      "svg": "<svg width='400' height='400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect x='100' y='100' width='200' height='200' fill='none' stroke='#000' stroke-width='2'/></svg>",
      "dimensions": [
        {"label": "Depth", "value": "200mm"},
        {"label": "Height", "value": "200mm"}
      ]
    }
  ]
}

SVG must have:
- Black outlines (stroke: #000, stroke-width: 2)
- Gray dimension lines (stroke: #666, stroke-width: 1)
- Dashed hidden edges (stroke-dasharray: 5,5)
- Dimension text
- viewBox for scaling

RESPOND WITH ONLY THE JSON OBJECT, NOTHING ELSE.`
            },
            {
              role: 'user',
              content: `Generate Top, Front, and Side orthographic views with dimensions for this OpenSCAD model:\n\n${currentCode}`
            }
          ],
          temperature: 0.3,
          max_tokens: 6000,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      console.log('AI Response:', content); // Debug log
      
      // Try to extract JSON from response - handle markdown code blocks
      let jsonStr = content;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      
      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Raw response:', content);
        throw new Error('No valid JSON found in response. The AI may not have returned the expected format.');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      if (!result.sketches || !Array.isArray(result.sketches)) {
        throw new Error('Invalid response format: missing sketches array');
      }
      
      setSketches(result.sketches);

    } catch (error) {
      console.error('Error generating sketches:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate sketches'}`);
    } finally {
      setLoading(false);
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
          <i className="pi pi-pencil" style={{ fontSize: '1.2rem', color: '#ffffff' }}></i>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: '#ffffff' }}>Sketcher Workbench</h3>
            <small style={{ color: '#666666', fontSize: '0.75rem' }}>
              Generate orthographic views (Top, Front, Side) of your model
            </small>
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

      {/* Generate Button */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #222222',
        backgroundColor: '#0a0a0a'
      }}>
        <Button
          label="Generate Orthographic Views"
          icon="pi pi-play"
          onClick={generateSketches}
          disabled={loading || !model?.source?.trim()}
          loading={loading}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: 'none',
            color: '#000000',
            fontWeight: 500
          }}
        />
      </div>

      {/* Sketches Display */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        backgroundColor: '#000000'
      }}>
        {loading && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            color: '#666666'
          }}>
            <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            <span>Analyzing model and generating technical drawings...</span>
          </div>
        )}

        {!loading && sketches.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666666',
            padding: '2rem 1rem'
          }}>
            <i className="pi pi-pencil" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}></i>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#a0a0a0' }}>
              Click "Generate Orthographic Views" to create 2D projections
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666666' }}>
              The AI will generate Top, Front, and Side views with dimensions
            </p>
          </div>
        )}

        {sketches.map((sketch, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '1.5rem',
              backgroundColor: '#141414',
              border: '1px solid #222222',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #222222',
              backgroundColor: '#0a0a0a'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500, color: '#ffffff' }}>
                {sketch.name}
              </h4>
            </div>
            
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '300px'
            }}>
              <div dangerouslySetInnerHTML={{ __html: sketch.svg }} />
            </div>

            {sketch.dimensions && sketch.dimensions.length > 0 && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#0a0a0a',
                borderTop: '1px solid #222222'
              }}>
                <h5 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.85rem', 
                  fontWeight: 500, 
                  color: '#a0a0a0' 
                }}>
                  Dimensions
                </h5>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {sketch.dimensions.map((dim, dimIdx) => (
                    <div
                      key={dimIdx}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#141414',
                        border: '1px solid #222222',
                        borderRadius: '4px'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#666666' }}>{dim.label}</div>
                      <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 500 }}>
                        {dim.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

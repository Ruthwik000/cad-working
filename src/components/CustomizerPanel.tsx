// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { CSSProperties, useContext } from 'react';
import { ModelContext } from './contexts.ts';

import { Dropdown } from 'primereact/dropdown';
import { Slider } from 'primereact/slider';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Parameter } from '../state/customizer-types.ts';
import { Button } from 'primereact/button';

export default function CustomizerPanel({className, style}: {className?: string, style?: CSSProperties}) {

  const model = useContext(ModelContext);
  if (!model) throw new Error('No model');

  const state = model.state;

  const handleRefresh = () => {
    model.checkSyntax();
  };

  const handleChange = (name: string, value: any) => {
    model.setVar(name, value);
  };

  const groupedParameters = (state.parameterSet?.parameters ?? []).reduce((acc, param) => {
    if (!acc[param.group]) {
      acc[param.group] = [];
    }
    acc[param.group].push(param);
    return acc;
  }, {} as { [key: string]: any[] });

  const groups = Object.entries(groupedParameters);
  const collapsedTabSet = new Set(state.view.collapsedCustomizerTabs ?? []);
  const setTabOpen = (name: string, open: boolean) => {
    if (open) {
      collapsedTabSet.delete(name);
    } else {
      collapsedTabSet.add(name)
    }
    model.mutate(s => s.view.collapsedCustomizerTabs = Array.from(collapsedTabSet));
  }

  return (
    <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
          backgroundColor: '#0a0a0a',
          ...style,
        }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #222222',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 500,
          color: '#ffffff',
          letterSpacing: '0.5px'
        }}>
          Parameters
        </h3>
        <Button
          icon="pi pi-refresh"
          onClick={handleRefresh}
          disabled={state.checkingSyntax}
          loading={state.checkingSyntax}
          rounded
          text
          tooltip="Refresh parameters"
          tooltipOptions={{position: 'left'}}
          style={{
            width: '32px',
            height: '32px',
            color: '#ffffff'
          }}
        />
      </div>

      {/* Parameters List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
        {groups.length === 0 ? (
          <div style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: '#666666',
            fontSize: '0.9rem'
          }}>
            No parameters available
          </div>
        ) : (
          groups.map(([group, params]) => (
            <div key={group} style={{
              marginBottom: '0.5rem',
              backgroundColor: '#000000',
              border: '1px solid #222222',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              {/* Group Header */}
              <button
                onClick={() => setTabOpen(group, collapsedTabSet.has(group))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0a0a0a',
                  border: 'none',
                  borderBottom: collapsedTabSet.has(group) ? 'none' : '1px solid #222222',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#141414'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
              >
                <span>{group}</span>
                <i className={`pi ${collapsedTabSet.has(group) ? 'pi-chevron-right' : 'pi-chevron-down'}`} 
                   style={{ fontSize: '0.8rem', color: '#666666' }} />
              </button>

              {/* Group Content */}
              {!collapsedTabSet.has(group) && (
                <div style={{ padding: '0.5rem' }}>
                  {params.map((param) => (
                    <ParameterInput
                      key={param.name}
                      value={(state.params.vars ?? {})[param.name]}
                      param={param}
                      handleChange={handleChange} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function ParameterInput({param, value, className, style, handleChange}: {param: Parameter, value: any, className?: string, style?: CSSProperties, handleChange: (key: string, value: any) => void}) {
  const hasChanged = value !== undefined && JSON.stringify(value) !== JSON.stringify(param.initial);
  
  return (
    <div 
      style={{
        padding: '0.75rem',
        marginBottom: '0.5rem',
        backgroundColor: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        ...style,
      }}>
      {/* Label Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: '#ffffff',
            marginBottom: '0.25rem'
          }}>
            {param.name}
          </label>
          {param.caption && (
            <div style={{
              fontSize: '0.75rem',
              color: '#666666'
            }}>
              {param.caption}
            </div>
          )}
        </div>
        
        {/* Reset Button */}
        {hasChanged && (
          <Button
            onClick={() => handleChange(param.name, param.initial)}
            icon='pi pi-refresh'
            text
            rounded
            title="Reset to default"
            style={{
              width: '28px',
              height: '28px',
              padding: 0,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#666666'
            }}
          />
        )}
      </div>

      {/* Input Section */}
      <div style={{ marginTop: '0.5rem' }}>
        {/* Dropdown for number with options */}
        {param.type === 'number' && 'options' in param && (
          <Dropdown
            value={value ?? param.initial}
            options={param.options}
            onChange={(e) => handleChange(param.name, e.value)}
            optionLabel="name"
            optionValue="value"
            style={{
              width: '100%',
              backgroundColor: '#0f0f0f',
              border: '1px solid #222222',
              color: '#ffffff'
            }}
          />
        )}
        
        {/* Dropdown for string with options */}
        {param.type === 'string' && param.options && (
          <Dropdown
            value={value ?? param.initial}
            options={param.options}
            onChange={(e) => handleChange(param.name, e.value)}
            optionLabel="name"
            optionValue="value"
            style={{
              width: '100%',
              backgroundColor: '#0f0f0f',
              border: '1px solid #222222',
              color: '#ffffff'
            }}
          />
        )}
        
        {/* Checkbox for boolean */}
        {param.type === 'boolean' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem',
            backgroundColor: '#0f0f0f',
            border: '1px solid #222222',
            borderRadius: '4px'
          }}>
            <Checkbox
              checked={value ?? param.initial}
              onChange={(e) => handleChange(param.name, e.checked)}
              style={{
                backgroundColor: (value ?? param.initial) ? '#ffffff' : '#0f0f0f',
                borderColor: '#222222'
              }}
            />
            <label style={{
              marginLeft: '0.5rem',
              fontSize: '0.85rem',
              color: '#a0a0a0'
            }}>
              {(value ?? param.initial) ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        )}
        
        {/* Number input with buttons */}
        {!Array.isArray(param.initial) && param.type === 'number' && !('options' in param) && (
          <div>
            <InputNumber
              value={value ?? param.initial}
              showButtons
              onValueChange={(e) => handleChange(param.name, e.value)}
              min={param.min}
              max={param.max}
              step={param.step}
              style={{
                width: '100%',
                backgroundColor: '#0f0f0f',
                border: '1px solid #222222',
                color: '#ffffff'
              }}
              inputStyle={{
                backgroundColor: '#0f0f0f',
                border: 'none',
                color: '#ffffff',
                textAlign: 'center'
              }}
            />
            
            {/* Slider for numbers with min/max */}
            {param.min !== undefined && param.max !== undefined && (
              <Slider
                value={value ?? param.initial}
                min={param.min}
                max={param.max}
                step={param.step}
                onChange={(e) => handleChange(param.name, e.value)}
                style={{
                  marginTop: '0.75rem',
                  width: '100%'
                }}
              />
            )}
          </div>
        )}
        
        {/* Text input for string */}
        {param.type === 'string' && !param.options && (
          <InputText
            value={value ?? param.initial}
            onChange={(e) => handleChange(param.name, e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0f0f0f',
              border: '1px solid #222222',
              color: '#ffffff',
              padding: '0.5rem'
            }}
          />
        )}
        
        {/* Array input */}
        {Array.isArray(param.initial) && 'min' in param && (
          <div style={{
            display: 'flex',
            gap: '0.5rem'
          }}>
            {param.initial.map((_, index) => (
              <InputNumber
                key={index}
                value={value?.[index] ?? (param.initial as any)[index]}
                min={param.min}
                max={param.max}
                showButtons
                step={param.step}
                onValueChange={(e) => {
                  const newArray = [...(value ?? param.initial)];
                  newArray[index] = e.value;
                  handleChange(param.name, newArray);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #222222',
                  color: '#ffffff'
                }}
                inputStyle={{
                  backgroundColor: '#0f0f0f',
                  border: 'none',
                  color: '#ffffff',
                  textAlign: 'center',
                  fontSize: '0.85rem'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
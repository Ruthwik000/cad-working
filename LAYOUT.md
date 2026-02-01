# VS Code-Like Layout

The app now has a professional VS Code-inspired layout:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Top Header Bar                          │
│  OpenSCAD Playground                    [AI Assistant Button]   │
├──────────────┬──────────────────────────┬───────────────────────┤
│              │                          │                       │
│              │    3D Preview Viewer     │                       │
│  Properties  │      (Top 50%)           │                       │
│  Customizer  │                          │    AI Chat Panel      │
│   (Left)     ├──────────────────────────┤      (Right)          │
│              │                          │                       │
│              │    Code Editor           │   - Chat history      │
│              │    (Bottom 50%)          │   - Input box         │
│              │                          │   - Context aware     │
│              │                          │                       │
├──────────────┴──────────────────────────┴───────────────────────┤
│                         Footer Bar                              │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Sections

### Top Header (PanelSwitcher)
- App title: "OpenSCAD Playground"
- AI Assistant toggle button
- Clean, minimal design

### Left Sidebar (300px)
- **Properties/Customizer Panel**
- Shows model parameters
- Adjustable values for customization
- Always visible

### Center Area (Flexible width)
Split vertically into two equal parts:

#### Top Half - 3D Preview
- Interactive 3D viewer
- Model rendering
- Camera controls
- Export options

#### Bottom Half - Code Editor
- Monaco editor (VS Code editor)
- Syntax highlighting
- Line numbers
- Auto-completion

### Right Sidebar (400px, toggleable)
- **AI Chat Interface**
- Only visible when AI button is clicked
- Context-aware code generation
- Edit existing models
- Chat history

### Bottom Footer
- Status information
- Render progress
- Error messages

## Key Features

1. **Fixed Layout**: No more switching between panels - everything is visible
2. **Professional**: Matches VS Code's familiar interface
3. **Efficient Workflow**: 
   - Write code in bottom editor
   - See preview in top viewer
   - Adjust properties on left
   - Get AI help on right
4. **Responsive**: Panels maintain their positions
5. **Clean**: No overlapping panels or z-index issues

## Workflow

1. **Start**: Open the app, see all panels at once
2. **Code**: Write OpenSCAD code in the bottom editor
3. **Preview**: See live 3D preview in top viewer
4. **Customize**: Adjust parameters in left sidebar
5. **AI Help**: Click AI button to open chat on right
6. **Iterate**: Make changes, AI can edit your code contextually

# Computer Vision Control - Developer Guide

## Architecture Overview

### Component Structure

```
src/components/
├── CVControlPanel.tsx       # Main CV control component
├── ViewerPanel.tsx          # 3D viewer with CV integration
└── App.tsx                  # Root application component

src/types/
└── mediapipe.d.ts          # TypeScript definitions for MediaPipe
```

### Data Flow

```
Camera Feed
    ↓
MediaPipe Hands (Hand Detection)
    ↓
Gesture Recognition Logic
    ↓
GestureData Interface
    ↓
ViewerPanel Handler
    ↓
3D Model Manipulation
```

## Key Components

### CVControlPanel

**Purpose**: Manages camera feed, hand tracking, and gesture recognition

**Props**:
- `visible: boolean` - Controls panel visibility
- `onGesture: (gesture: GestureData) => void` - Callback for detected gestures

**State**:
- `isActive: boolean` - Whether hand is in active zone
- `cursorColor: string` - Visual feedback for current gesture
- `gestureText: string` - Human-readable gesture description

**Key Methods**:
- `onResults(results: Results)` - Processes MediaPipe hand tracking results
- `calculateDistance(point1, point2)` - Computes distance between landmarks
- `isIndexFingerUp(landmarks)` - Detects pointing gesture
- `isPinchGesture(landmarks)` - Detects grab gesture
- `isOpenHand(landmarks)` - Detects open palm
- `isClosedFist(landmarks)` - Detects fist gesture
- `isInActiveZone(x, y)` - Checks if hand is in functional area

### GestureData Interface

```typescript
interface GestureData {
  type: 'point' | 'grab' | 'drag' | 'drop' | 'orbit' | 'pan' | 'zoom' | 'idle';
  position?: { x: number; y: number };  // Normalized 0-1
  delta?: { x: number; y: number };     // Movement delta
  distance?: number;                     // For zoom gesture
  hands: number;                         // Number of hands detected
}
```

### ViewerPanel Integration

**New State**:
- `cvControlEnabled: boolean` - Toggle CV control on/off
- `grabbedObject: boolean` - Track if object is currently grabbed

**Handler**: `handleGesture(gesture: GestureData)`
- Maps gestures to 3D viewer actions
- Updates camera orbit, target, and radius
- Provides visual feedback via toasts

## Gesture Detection Logic

### Hand Landmarks

MediaPipe provides 21 landmarks per hand:

```
0:  Wrist
1-4:  Thumb (CMC, MCP, IP, TIP)
5-8:  Index (MCP, PIP, DIP, TIP)
9-12: Middle (MCP, PIP, DIP, TIP)
13-16: Ring (MCP, PIP, DIP, TIP)
17-20: Pinky (MCP, PIP, DIP, TIP)
```

### Detection Algorithms

#### Point Gesture
```typescript
isIndexFingerUp(landmarks) {
  return landmarks[8].y < landmarks[6].y;  // Tip above PIP
}

areOtherFingersCurled(landmarks) {
  return (
    landmarks[12].y > landmarks[10].y &&  // Middle curled
    landmarks[16].y > landmarks[14].y &&  // Ring curled
    landmarks[20].y > landmarks[18].y     // Pinky curled
  );
}
```

#### Pinch Gesture
```typescript
isPinchGesture(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = calculateDistance(thumbTip, indexTip);
  return distance < 0.05;  // Threshold in normalized coords
}
```

#### Open Hand
```typescript
isOpenHand(landmarks) {
  return (
    landmarks[8].y < landmarks[6].y &&   // Index extended
    landmarks[12].y < landmarks[10].y && // Middle extended
    landmarks[16].y < landmarks[14].y && // Ring extended
    landmarks[20].y < landmarks[18].y    // Pinky extended
  );
}
```

#### Closed Fist
```typescript
isClosedFist(landmarks) {
  const palm = landmarks[0];
  return (
    calculateDistance(landmarks[8], palm) < 0.15 &&
    calculateDistance(landmarks[12], palm) < 0.15 &&
    calculateDistance(landmarks[16], palm) < 0.15 &&
    calculateDistance(landmarks[20], palm) < 0.15
  );
}
```

#### Active Zone
```typescript
isInActiveZone(x, y) {
  return x > 0.15 && x < 0.85 && y > 0.15 && y < 0.85;
}
```

## 3D Viewer Integration

### Camera Orbit Manipulation

```typescript
const orbit = viewer.getCameraOrbit();
// orbit = { theta: number, phi: number, radius: number }

// Rotate horizontally
orbit.theta += delta.x * sensitivity;

// Rotate vertically (clamped)
orbit.phi -= delta.y * sensitivity;
orbit.phi = Math.max(0, Math.min(Math.PI, orbit.phi));

viewer.cameraOrbit = orbit.toString();
```

### Camera Target (Pan)

```typescript
const target = viewer.getCameraTarget();
// target = { x: number, y: number, z: number }

target.x -= delta.x * panSpeed;
target.y += delta.y * panSpeed;

viewer.cameraTarget = `${target.x}m ${target.y}m ${target.z}m`;
```

### Zoom (Radius)

```typescript
orbit.radius = Math.max(minRadius, orbit.radius - distance * zoomSpeed);
viewer.cameraOrbit = orbit.toString();
```

## Configuration

### MediaPipe Settings

```typescript
hands.setOptions({
  maxNumHands: 2,              // Detect up to 2 hands
  modelComplexity: 1,          // 0=lite, 1=full
  minDetectionConfidence: 0.7, // Initial detection threshold
  minTrackingConfidence: 0.7   // Tracking threshold
});
```

### Camera Settings

```typescript
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,   // Resolution
  height: 480
});
```

### Sensitivity Tuning

Located in `ViewerPanel.tsx` `handleGesture()`:

```typescript
// Drag rotation sensitivity
orbit.theta += gesture.delta.x * 5;
orbit.phi -= gesture.delta.y * 5;

// Orbit rotation sensitivity
orbit.theta += gesture.delta.x * 3;
orbit.phi -= gesture.delta.y * 3;

// Pan sensitivity
target.x -= gesture.delta.x * 2;
target.y += gesture.delta.y * 2;

// Zoom sensitivity
orbit.radius -= gesture.distance * 5;
```

## Performance Optimization

### Throttling

Consider adding throttling for high-frequency gestures:

```typescript
const throttledGesture = useCallback(
  throttle((gesture: GestureData) => {
    handleGesture(gesture);
  }, 50), // 50ms = ~20 FPS
  [handleGesture]
);
```

### Conditional Rendering

The CV panel only renders when `visible={true}`:

```typescript
if (!visible) return null;
```

### Resource Cleanup

```typescript
useEffect(() => {
  // Setup
  const camera = new Camera(...);
  const hands = new Hands(...);
  
  return () => {
    // Cleanup
    camera.stop();
    hands.close();
  };
}, [visible]);
```

## Testing

### Manual Testing Checklist

- [ ] Camera permissions granted
- [ ] Hand detection works in good lighting
- [ ] All 7 gestures recognized correctly
- [ ] Active zone boundary works
- [ ] Cursor colors change appropriately
- [ ] 3D model responds to gestures
- [ ] Two-hand zoom works
- [ ] Performance is smooth (>20 FPS)
- [ ] Toggle button works
- [ ] Panel resizes viewer correctly

### Browser Testing

- [ ] Chrome/Edge (recommended)
- [ ] Firefox
- [ ] Safari (HTTPS required)

## Extending the System

### Adding New Gestures

1. Define detection logic in `CVControlPanel.tsx`:
```typescript
const isNewGesture = (landmarks: any[]): boolean => {
  // Your detection logic
  return condition;
};
```

2. Add to `onResults()` processing:
```typescript
if (isNewGesture(landmarks)) {
  onGesture({
    type: 'newGesture',
    // ... additional data
  });
}
```

3. Update `GestureData` interface:
```typescript
type: 'point' | 'grab' | ... | 'newGesture';
```

4. Handle in `ViewerPanel.tsx`:
```typescript
case 'newGesture':
  // Implement 3D viewer action
  break;
```

### Custom Sensitivity Settings

Add UI controls for sensitivity:

```typescript
const [dragSensitivity, setDragSensitivity] = useState(5);
const [orbitSensitivity, setOrbitSensitivity] = useState(3);

// Use in handleGesture
orbit.theta += gesture.delta.x * dragSensitivity;
```

### Gesture History/Smoothing

Implement smoothing for jittery movements:

```typescript
const gestureHistory = useRef<GestureData[]>([]);

const smoothedGesture = (gesture: GestureData) => {
  gestureHistory.current.push(gesture);
  if (gestureHistory.current.length > 5) {
    gestureHistory.current.shift();
  }
  
  // Average the deltas
  const avgDelta = {
    x: average(gestureHistory.current.map(g => g.delta?.x || 0)),
    y: average(gestureHistory.current.map(g => g.delta?.y || 0))
  };
  
  return { ...gesture, delta: avgDelta };
};
```

## Troubleshooting

### Common Issues

**Issue**: Hand not detected
- Check camera permissions
- Verify MediaPipe CDN is accessible
- Check browser console for errors

**Issue**: Gestures not triggering
- Verify active zone logic
- Check threshold values
- Add console.log in detection functions

**Issue**: Poor performance
- Reduce `modelComplexity` to 0
- Lower camera resolution
- Implement throttling

**Issue**: Inaccurate tracking
- Improve lighting
- Reduce background clutter
- Adjust confidence thresholds

## Dependencies

```json
{
  "@mediapipe/hands": "^0.4.x",
  "@mediapipe/camera_utils": "^0.3.x",
  "@mediapipe/drawing_utils": "^0.3.x"
}
```

## Resources

- [MediaPipe Hands Documentation](https://google.github.io/mediapipe/solutions/hands.html)
- [Hand Landmark Model](https://google.github.io/mediapipe/solutions/hands.html#hand-landmark-model)
- [model-viewer Documentation](https://modelviewer.dev/)

## License

This CV control feature integrates with the existing OpenSCAD Playground license. MediaPipe is licensed under Apache 2.0.

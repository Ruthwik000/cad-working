# Computer Vision Hand Control Feature

## Overview
This feature adds hand gesture control to the 3D viewer using MediaPipe Hands for real-time hand tracking. Users can interact with the 3D model using natural hand gestures captured through their webcam.

## How to Use

1. **Enable CV Control**: Click the "CV Control OFF" button in the top-right corner of the 3D viewer
2. **Camera Access**: Grant camera permissions when prompted
3. **Camera Feed**: A camera feed panel will appear at the bottom of the viewer (200px height)
4. **Active Zone**: Keep your hands in the center 70% of the screen (marked with a dashed green border) for gestures to be recognized

## Supported Gestures

### Single Hand Gestures

#### 1. Point (Hover)
- **Action**: Index finger up, other fingers curled
- **Detection**: Index tip is the highest point
- **Result**: Moves cursor and highlights objects under the finger
- **Cursor Color**: Green (active zone) / Red (inactive zone)

#### 2. Grab (Select)
- **Action**: Pinch gesture (Index + Thumb)
- **Detection**: Distance between tips < 20px
- **Result**: Attaches the object to the hand
- **Cursor Color**: Yellow

#### 3. Drag (Move)
- **Action**: Hold pinch + Move hand
- **Detection**: Pinch is active + Wrist moves
- **Result**: Translates/rotates the object in 3D space
- **Cursor Color**: Yellow

#### 4. Drop (Release)
- **Action**: Open hand after grabbing
- **Detection**: Distance between tips > 40px
- **Result**: Detaches the object at the new location
- **Cursor Color**: Returns to default

#### 5. Orbit View
- **Action**: Closed fist + Move
- **Detection**: All fingertips near the palm
- **Result**: Rotates the camera view around the center
- **Cursor Color**: Magenta

#### 6. Pan View
- **Action**: Open palm + Move
- **Detection**: Fingers extended and spread
- **Result**: Slides the camera view (Left, Right, Up, Down)
- **Cursor Color**: Cyan

### Two Hand Gestures

#### 7. Zoom (Scale)
- **Action**: Pinch with both hands
- **Detection**: Distance between wrists changes
- **Result**: Moving hands apart increases size; moving together decreases size
- **Cursor Color**: Blue

## Rotation Mechanism (The Ratchet)

To allow full 360° rotation despite limited wrist movement, the system uses a clutch-based approach:

1. **Engage**: Pinch the object (Clutch On)
2. **Turn**: Rotate your wrist - the object rotates by the same amount
3. **Disengage**: Open your hand (Clutch Off) - the object freezes at the current angle
4. **Reset**: Rotate your wrist back to a comfortable position without moving the object
5. **Repeat**: Pinch and turn again to continue rotating

## Safety & UX Controls

### A. The Active Zone
The system defines a functional area in the center 70% of the screen:
- **Active**: Hand is in the center - cursor is green and responsive
- **Inactive**: Hand is at the edge - cursor turns red and ignores input, allowing users to rest their arms

### B. Visual Feedback
- **Status Bar**: Shows current gesture and active/inactive state
- **Cursor Indicator**: Color-coded dot showing gesture type
- **Active Zone Overlay**: Dashed green border showing the functional area
- **Toast Notifications**: Brief messages for grab/release actions

## Technical Implementation

### Dependencies
- `@mediapipe/hands`: Hand landmark detection
- `@mediapipe/camera_utils`: Camera feed management
- `@mediapipe/drawing_utils`: Hand skeleton visualization

### Components
- **CVControlPanel.tsx**: Main CV control component with MediaPipe integration
- **ViewerPanel.tsx**: Updated to integrate CV controls with the 3D viewer

### Gesture Detection Logic
- **Point**: Index tip Y < Index PIP Y, other fingers curled
- **Pinch**: Distance(thumb tip, index tip) < 0.05 (normalized)
- **Open Hand**: All fingers extended (tip Y < PIP Y)
- **Closed Fist**: All fingertips within 0.15 distance from palm
- **Active Zone**: X ∈ [0.15, 0.85], Y ∈ [0.15, 0.85]

### Camera Configuration
- Resolution: 640x480
- Max Hands: 2
- Model Complexity: 1
- Detection Confidence: 0.7
- Tracking Confidence: 0.7

## Performance Considerations

- The camera feed is mirrored for intuitive interaction
- Hand tracking runs at ~30 FPS on modern hardware
- MediaPipe models are loaded from CDN on first use
- The CV panel can be toggled on/off to save resources when not needed

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Requires HTTPS or localhost for camera access
- Mobile: Limited support (requires powerful device)

## Privacy

- All processing happens locally in the browser
- No video or hand data is sent to any server
- Camera access can be revoked at any time through browser settings

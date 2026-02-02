# Hand Gesture Control Guide

## Visual Reference

### Single Hand Gestures

```
┌─────────────────────────────────────────────────────────────┐
│  POINT (HOVER)                                              │
│  ═══════════════                                            │
│                                                             │
│     👆                                                      │
│    Index finger up, others curled                          │
│                                                             │
│  • Moves cursor over 3D objects                            │
│  • Highlights objects under finger                         │
│  • Cursor: GREEN (active) / RED (inactive)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  GRAB (SELECT)                                              │
│  ═══════════════                                            │
│                                                             │
│     🤏                                                      │
│    Pinch: Index + Thumb together                           │
│                                                             │
│  • Attaches object to hand                                 │
│  • Distance between tips < 20px                            │
│  • Cursor: YELLOW                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DRAG (MOVE)                                                │
│  ═══════════════                                            │
│                                                             │
│     🤏 ➡️                                                   │
│    Hold pinch + Move wrist                                 │
│                                                             │
│  • Rotates/translates object in 3D                         │
│  • Follows hand movement                                   │
│  • Cursor: YELLOW                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DROP (RELEASE)                                             │
│  ═══════════════                                            │
│                                                             │
│     ✋                                                      │
│    Open hand after grabbing                                │
│                                                             │
│  • Releases object at current position                     │
│  • Distance between tips > 40px                            │
│  • Cursor: Returns to default                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ORBIT VIEW                                                 │
│  ═══════════════                                            │
│                                                             │
│     ✊ 🔄                                                   │
│    Closed fist + Move                                      │
│                                                             │
│  • Rotates camera around model center                      │
│  • All fingertips near palm                                │
│  • Cursor: MAGENTA                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PAN VIEW                                                   │
│  ═══════════════                                            │
│                                                             │
│     ✋ ⬆️⬇️⬅️➡️                                            │
│    Open palm + Move                                        │
│                                                             │
│  • Slides camera view in any direction                     │
│  • Fingers extended and spread                             │
│  • Cursor: CYAN                                            │
└─────────────────────────────────────────────────────────────┘

### Two Hand Gestures

┌─────────────────────────────────────────────────────────────┐
│  ZOOM (SCALE)                                               │
│  ═══════════════                                            │
│                                                             │
│     🤏 ↔️ 🤏                                                │
│    Pinch with both hands                                   │
│                                                             │
│  • Hands apart = Zoom IN (larger)                          │
│  • Hands together = Zoom OUT (smaller)                     │
│  • Cursor: BLUE                                            │
└─────────────────────────────────────────────────────────────┘
```

## The Ratchet Mechanism

For continuous 360° rotation with limited wrist movement:

```
Step 1: ENGAGE          Step 2: TURN           Step 3: DISENGAGE
   🤏                      🤏 ↻                    ✋
Pinch object          Rotate wrist           Open hand
(Clutch ON)           Object rotates         Object freezes

Step 4: RESET           Step 5: REPEAT
   ✋ ↺                    🤏 ↻
Rotate wrist back     Pinch and turn again
(No object movement)  Continue rotation
```

## Active Zone

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  INACTIVE ZONE (Red cursor - input ignored)                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  ACTIVE ZONE (Green cursor - responsive)             │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │                                                 │ │ │
│  │  │         Center 70% of screen                    │ │ │
│  │  │         Dashed green border                     │ │ │
│  │  │         All gestures work here                  │ │ │
│  │  │                                                 │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  INACTIVE ZONE (Red cursor - rest your arms)               │
└─────────────────────────────────────────────────────────────┘
```

## Cursor Color Legend

| Color   | Gesture      | Status                    |
|---------|--------------|---------------------------|
| 🔴 RED   | Idle         | Inactive zone / No hands  |
| 🟢 GREEN | Point        | Active zone, hovering     |
| 🟡 YELLOW| Grab/Drag    | Object attached to hand   |
| 🟣 MAGENTA| Orbit       | Rotating camera view      |
| 🔵 CYAN  | Pan          | Sliding camera view       |
| 🔵 BLUE  | Zoom         | Two-hand scaling          |

## Tips for Best Experience

1. **Lighting**: Ensure good lighting for accurate hand detection
2. **Background**: Plain backgrounds work best
3. **Distance**: Keep hands 1-2 feet from camera
4. **Active Zone**: Stay in the center 70% for responsive control
5. **Smooth Movements**: Slow, deliberate gestures work better than quick jerks
6. **Camera Position**: Position camera to capture full hand movements
7. **Rest Breaks**: Move hands to edges to rest without triggering actions

## Troubleshooting

### Hand Not Detected
- Check camera permissions in browser
- Improve lighting conditions
- Ensure hands are fully visible
- Try moving closer/farther from camera

### Gestures Not Responding
- Verify you're in the active zone (green border)
- Make gestures more deliberate and clear
- Check that fingers are fully extended/curled as needed
- Reduce background clutter

### Laggy Performance
- Close other browser tabs
- Reduce browser window size
- Check CPU usage
- Try disabling CV control when not needed

### Inaccurate Tracking
- Clean camera lens
- Improve lighting (avoid backlighting)
- Remove hand jewelry/accessories
- Ensure solid-colored background

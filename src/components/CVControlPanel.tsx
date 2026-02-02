import { useEffect, useRef, useState } from 'react';

export interface GestureData {
  type: 'point' | 'grab' | 'drag' | 'drop' | 'orbit' | 'pan' | 'zoom' | 'idle';
  position?: { x: number; y: number };
  delta?: { x: number; y: number };
  distance?: number;
  hands: number;
}

interface CVControlPanelProps {
  onGesture: (gesture: GestureData) => void;
  visible: boolean;
}

const CVControlPanel = ({ onGesture, visible }: CVControlPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gestureText, setGestureText] = useState('Initializing...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [cursorColor, setCursorColor] = useState('red');
  
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const previousPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const previousPinchDistanceRef = useRef<number | null>(null);

  // Force reload indicator
  useEffect(() => {
    console.log('CVControlPanel LOADED - Version 3.0 with TensorFlow hand tracking');
  }, []);

  const calculateDistance = (point1: any, point2: any): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isIndexFingerUp = (keypoints: any[]): boolean => {
    return keypoints[8].y < keypoints[6].y;
  };

  const areOtherFingersCurled = (keypoints: any[]): boolean => {
    return (
      keypoints[12].y > keypoints[10].y &&
      keypoints[16].y > keypoints[14].y &&
      keypoints[20].y > keypoints[18].y
    );
  };

  const isOpenHand = (keypoints: any[]): boolean => {
    return (
      keypoints[8].y < keypoints[6].y &&
      keypoints[12].y < keypoints[10].y &&
      keypoints[16].y < keypoints[14].y &&
      keypoints[20].y < keypoints[18].y
    );
  };

  const isClosedFist = (keypoints: any[]): boolean => {
    const palm = keypoints[0];
    return (
      calculateDistance(keypoints[8], palm) < 80 &&
      calculateDistance(keypoints[12], palm) < 80 &&
      calculateDistance(keypoints[16], palm) < 80 &&
      calculateDistance(keypoints[20], palm) < 80
    );
  };

  const drawHand = (ctx: CanvasRenderingContext2D, keypoints: any[]) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    // Draw connections with thicker lines
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    
    for (const [start, end] of connections) {
      ctx.beginPath();
      ctx.moveTo(keypoints[start].x, keypoints[start].y);
      ctx.lineTo(keypoints[end].x, keypoints[end].y);
      ctx.stroke();
    }

    // Draw keypoints with larger dots
    ctx.shadowBlur = 15;
    for (const keypoint of keypoints) {
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add white outline
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
  };

  const detectHands = async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const hands = await detectorRef.current.estimateHands(video);

      // Always clear and redraw the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Make canvas transparent so video shows through
      ctx.globalAlpha = 1.0;

      if (hands.length > 0) {
        // Draw hand skeletons on top of video
        for (const hand of hands) {
          if (hand.keypoints) {
            drawHand(ctx, hand.keypoints);
          }
        }

        const keypoints = hands[0].keypoints;
        if (keypoints) {
          const indexTip = keypoints[8];
          const thumbTip = keypoints[4];
          const wrist = keypoints[0];
          
          const pinchDistance = calculateDistance(thumbTip, indexTip);
          
          // Pinch gesture - Zoom based on pinch distance (increased threshold to 80)
          if (pinchDistance < 80) {
            setCursorColor('yellow');
            setIsActive(true);
            
            if (!isPinchingRef.current) {
              isPinchingRef.current = true;
              previousPinchDistanceRef.current = pinchDistance;
              setGestureText('Pinch detected - Move fingers to zoom');
              console.log('PINCH started at distance:', pinchDistance);
              onGesture({ type: 'grab', position: { x: indexTip.x / canvas.width, y: indexTip.y / canvas.height }, hands: 1 });
            } else {
              if (previousPinchDistanceRef.current !== null) {
                const distanceChange = pinchDistance - previousPinchDistanceRef.current;
                
                // Only send zoom if there's meaningful change (more than 1 pixel)
                if (Math.abs(distanceChange) > 1) {
                  // Positive distanceChange = fingers moving apart = zoom in
                  // Negative distanceChange = fingers moving together = zoom out
                  setGestureText(`Zoom: ${distanceChange > 0 ? 'IN ↑' : 'OUT ↓'} (${Math.abs(distanceChange).toFixed(0)}px)`);
                  console.log('ZOOM gesture - distance change:', distanceChange, 'current:', pinchDistance, 'previous:', previousPinchDistanceRef.current);
                  
                  onGesture({ 
                    type: 'zoom', 
                    distance: distanceChange / 50, // Increased sensitivity (was /100)
                    hands: 1 
                  });
                  
                  previousPinchDistanceRef.current = pinchDistance;
                }
              }
            }
          }
          // Point gesture - Hover
          else if (isIndexFingerUp(keypoints) && areOtherFingersCurled(keypoints)) {
            if (isPinchingRef.current) {
              setGestureText('Released');
              onGesture({ type: 'drop', position: { x: indexTip.x / canvas.width, y: indexTip.y / canvas.height }, hands: 1 });
              isPinchingRef.current = false;
              previousPositionRef.current = null;
            }
            setCursorColor('cyan');
            setIsActive(true);
            setGestureText('Point - Hover mode');
            onGesture({ type: 'point', position: { x: indexTip.x / canvas.width, y: indexTip.y / canvas.height }, hands: 1 });
          }
          // Open hand - Pan
          else if (isOpenHand(keypoints)) {
            if (isPinchingRef.current) {
              setGestureText('Released');
              onGesture({ type: 'drop', position: { x: indexTip.x / canvas.width, y: indexTip.y / canvas.height }, hands: 1 });
              isPinchingRef.current = false;
              previousPositionRef.current = null;
            } else {
              setCursorColor('blue');
              setIsActive(true);
              setGestureText('Open hand - Pan view');
              
              if (previousPositionRef.current) {
                const delta = {
                  x: (wrist.x - previousPositionRef.current.x) / canvas.width,
                  y: (wrist.y - previousPositionRef.current.y) / canvas.height
                };
                onGesture({ type: 'pan', delta, hands: 1 });
              }
              previousPositionRef.current = { x: wrist.x, y: wrist.y };
            }
          }
          // Closed fist - Orbit
          else if (isClosedFist(keypoints)) {
            setCursorColor('magenta');
            setIsActive(true);
            setGestureText('Fist - Orbit camera');
            
            if (previousPositionRef.current) {
              const delta = {
                x: (wrist.x - previousPositionRef.current.x) / canvas.width,
                y: (wrist.y - previousPositionRef.current.y) / canvas.height
              };
              onGesture({ type: 'orbit', delta, hands: 1 });
            }
            previousPositionRef.current = { x: wrist.x, y: wrist.y };
          }
          else {
            if (isPinchingRef.current) {
              setGestureText('Released');
              console.log('RELEASE gesture');
              onGesture({ type: 'drop', position: { x: indexTip.x / canvas.width, y: indexTip.y / canvas.height }, hands: 1 });
              isPinchingRef.current = false;
              previousPositionRef.current = null;
              previousPinchDistanceRef.current = null;
            } else {
              setCursorColor('green');
              setIsActive(true);
              setGestureText('Hand detected - Pinch to zoom');
              onGesture({ type: 'point', position: { x: indexTip.x / canvas.width, y: indexTip.y / canvas.height }, hands: 1 });
            }
          }
        }

        // Two hands - Zoom
        if (hands.length === 2) {
          const hand1Wrist = hands[0].keypoints?.[0];
          const hand2Wrist = hands[1].keypoints?.[0];
          
          if (hand1Wrist && hand2Wrist) {
            const distance = calculateDistance(hand1Wrist, hand2Wrist);
            
            setCursorColor('purple');
            setIsActive(true);
            setGestureText('Two hands - Zoom');
            
            if (previousPositionRef.current) {
              const distanceDelta = (distance - (previousPositionRef.current.x || distance)) / canvas.width;
              onGesture({ type: 'zoom', distance: distanceDelta, hands: 2 });
            }
            previousPositionRef.current = { x: distance, y: 0 };
          }
        }
      } else {
        setCursorColor('red');
        setIsActive(false);
        setGestureText('No hands detected');
        isPinchingRef.current = false;
        previousPositionRef.current = null;
        onGesture({ type: 'idle', hands: 0 });
      }
    } catch (error) {
      console.error('Detection error:', error);
    }

    if (visible) {
      animationRef.current = requestAnimationFrame(detectHands);
    }
  };

  useEffect(() => {
    if (!visible || !videoRef.current || !canvasRef.current) return;

    let isMounted = true;

    const initialize = async () => {
      try {
        setGestureText('Starting camera...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setCameraError(null);
        }

        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });

        setGestureText('Loading hand tracking...');

        const handPoseDetection = await import('@tensorflow-models/hand-pose-detection');
        await import('@tensorflow/tfjs-backend-webgl');

        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detector = await handPoseDetection.createDetector(model, {
          runtime: 'tfjs',
          modelType: 'lite',
          maxHands: 2
        });

        if (!isMounted) {
          detector.dispose();
          return;
        }

        detectorRef.current = detector;
        setGestureText('Ready - Show your hands');

        detectHands();

      } catch (error) {
        console.error('Failed to initialize:', error);
        setCameraError(`Error: ${error}`);
        setGestureText('Failed to load hand tracking');
      }
    };

    initialize();

    return () => {
      isMounted = false;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      width: '400px',
      height: '300px',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      border: '2px solid #4CAF50',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
    }}>
      <div style={{
        padding: '8px 16px',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderBottom: '1px solid #4CAF50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: cursorColor,
            boxShadow: `0 0 10px ${cursorColor}`
          }} />
          <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
            {gestureText}
          </span>
        </div>
        <div style={{ color: isActive ? '#4CAF50' : '#f44336', fontSize: '0.85rem', fontWeight: 600 }}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
        {cameraError ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#f44336',
            padding: '20px',
            textAlign: 'center',
            fontSize: '0.85rem'
          }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
              <div>{cameraError}</div>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                zIndex: 1
              }}
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                zIndex: 2,
                pointerEvents: 'none'
              }}
            />
            
            <div style={{
              position: 'absolute',
              top: '15%',
              left: '15%',
              right: '15%',
              bottom: '15%',
              border: '2px dashed rgba(76, 175, 80, 0.5)',
              pointerEvents: 'none',
              borderRadius: '8px',
              zIndex: 3
            }} />
          </>
        )}
      </div>
    </div>
  );
};

export default CVControlPanel;

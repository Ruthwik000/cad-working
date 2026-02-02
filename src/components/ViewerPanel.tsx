// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import { CSSProperties, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ModelContext } from './contexts.ts';
import { Toast } from 'primereact/toast';
import { blurHashToImage, imageToBlurhash, imageToThumbhash, thumbHashToImage } from '../io/image_hashes.ts';
import { Parameter } from '../state/customizer-types.ts';
import CVControlPanel, { GestureData } from './CVControlPanel.tsx';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

export const PREDEFINED_ORBITS: [string, number, number][] = [
  ["Diagonal", Math.PI / 4, Math.PI / 4],
  ["Front", 0, Math.PI / 2],
  ["Right", Math.PI / 2, Math.PI / 2],
  ["Back", Math.PI, Math.PI / 2],
  ["Left", -Math.PI / 2, Math.PI / 2],
  ["Top", 0, 0],
  ["Bottom", 0, Math.PI],
];

function spherePoint(theta: number, phi: number): [number, number, number] {
  return [
    Math.cos(theta) * Math.sin(phi),
    Math.sin(theta) * Math.sin(phi),
    Math.cos(phi),
  ];
}

function euclideanDist(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
const radDist = (a: number, b: number) => Math.min(Math.abs(a - b), Math.abs(a - b + 2 * Math.PI), Math.abs(a - b - 2 * Math.PI));

function getClosestPredefinedOrbitIndex(theta: number, phi: number): [number, number, number] {
  const point = spherePoint(theta, phi);
  const points = PREDEFINED_ORBITS.map(([_, t, p]) => spherePoint(t, p));
  const distances = points.map(p => euclideanDist(point, p));
  const radDistances = PREDEFINED_ORBITS.map(([_, ptheta, pphi]) => Math.max(radDist(theta, ptheta), radDist(phi, pphi)));
  const [index, dist] = distances.reduce((acc, d, i) => d < acc[1] ? [i, d] : acc, [0, Infinity]) as [number, number];
  return [index, dist, radDistances[index]];
}

const originalOrbit = (([name, theta, phi]) => `${theta}rad ${phi}rad auto`)(PREDEFINED_ORBITS[0]);

export default function ViewerPanel({className, style}: {className?: string, style?: CSSProperties}) {
  const model = useContext(ModelContext);
  if (!model) throw new Error('No model');

  const state = model.state;
  const [interactionPrompt, setInteractionPrompt] = useState('auto');
  const modelViewerRef = useRef<any>();
  const axesViewerRef = useRef<any>();
  const toastRef = useRef<Toast>(null);

  const [loadedUri, setLoadedUri] = useState<string | undefined>();

  const [cachedImageHash, setCachedImageHash] = useState<{hash: string, uri: string} | undefined>(undefined);
  
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedPartPosition, setSelectedPartPosition] = useState({x: 0, y: 0});
  const [grabbedObject, setGrabbedObject] = useState(false);

  const modelUri = state.output?.displayFileURL ?? state.output?.outFileURL ?? '';
  const loaded = loadedUri === modelUri;

  if (state?.preview) {
    let {hash, uri} = cachedImageHash ?? {};
    if (state.preview.blurhash && hash !== state.preview.blurhash) {
      hash = state.preview.blurhash;
      uri = blurHashToImage(hash, 100, 100);
      setCachedImageHash({hash, uri});
    } else if (state.preview.thumbhash && hash !== state.preview.thumbhash) {
      hash = state.preview.thumbhash;
      uri = thumbHashToImage(hash);
      setCachedImageHash({hash, uri});
    }
  } else if (cachedImageHash) {
    setCachedImageHash(undefined);
  }

  const onLoad = useCallback(async (e: any) => {
    setLoadedUri(modelUri);
    console.log('onLoad', e);

    if (!modelViewerRef.current) return;

    const uri = await modelViewerRef.current.toDataURL('image/png', 0.5);
    const preview = {blurhash: await imageToBlurhash(uri)};
    // const preview = {thumbhash: await imageToThumbhash(uri)};
    console.log(preview);
    
    model?.mutate(s => s.preview = preview);
  }, [model, modelUri, setLoadedUri, modelViewerRef.current]);

  useEffect(() => {
    if (!modelViewerRef.current) return;

    const element = modelViewerRef.current;
    element.addEventListener('load', onLoad);
    return () => element.removeEventListener('load', onLoad);
  }, [modelViewerRef.current, onLoad]);


  for (const ref of [modelViewerRef, axesViewerRef]) {
    const otherRef = ref === modelViewerRef ? axesViewerRef : modelViewerRef;
    useEffect(() => {
      if (!ref.current) return;

      function handleCameraChange(e: any) {
        if (!otherRef.current) return;
        if (e.detail.source === 'user-interaction') {
          const cameraOrbit = ref.current.getCameraOrbit();
          cameraOrbit.radius = otherRef.current.getCameraOrbit().radius;
        
          otherRef.current.cameraOrbit = cameraOrbit.toString();
        }
      }
      const element = ref.current;
      element.addEventListener('camera-change', handleCameraChange);
      return () => element.removeEventListener('camera-change', handleCameraChange);
    }, [ref.current, otherRef.current]);
  }

  // Cycle through predefined views when user clicks on the axes viewer
  useEffect(() => {
    let mouseDownSpherePoint: [number, number, number] | undefined;
    function getSpherePoint() {
      const orbit = axesViewerRef.current.getCameraOrbit();
      return spherePoint(orbit.theta, orbit.phi);
    }
    function onMouseDown(e: MouseEvent) {
      if (e.target === axesViewerRef.current) {
        mouseDownSpherePoint = getSpherePoint();
      }
    }
    function onMouseUp(e: MouseEvent) {
      if (e.target === axesViewerRef.current) {
        const euclEps = 0.01;
        const radEps = 0.1;

        const spherePoint = getSpherePoint();
        const clickDist = mouseDownSpherePoint ? euclideanDist(spherePoint, mouseDownSpherePoint) : Infinity;
        if (clickDist > euclEps) {
          return;
        }
        // Note: unlike the axes viewer, the model viewer has a prompt that makes the model wiggle around, we only fetch it to get the radius.
        const axesOrbit = axesViewerRef.current.getCameraOrbit();
        const modelOrbit = modelViewerRef.current.getCameraOrbit();
        const [currentIndex, dist, radDist] = getClosestPredefinedOrbitIndex(axesOrbit.theta, axesOrbit.phi);
        const newIndex = dist < euclEps && radDist < radEps ? (currentIndex + 1) % PREDEFINED_ORBITS.length : currentIndex;
        const [name, theta, phi] = PREDEFINED_ORBITS[newIndex];
        Object.assign(modelOrbit, {theta, phi});
        const newOrbit = modelViewerRef.current.cameraOrbit = axesViewerRef.current.cameraOrbit = modelOrbit.toString();
        toastRef.current?.show({severity: 'info', detail: `${name} view`, life: 1000,});
        setInteractionPrompt('none');
      }
    }
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    // window.addEventListener('click', onClick);
    return () => {
      // window.removeEventListener('click', onClick);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  });

  // Click on model parts to select and show parameter
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.target === modelViewerRef.current && state.parameterSet?.parameters?.length) {
        const viewer = modelViewerRef.current;
        const rect = viewer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get the 3D hit point
        const hit = viewer.positionAndNormalFromPoint(x, y);
        
        if (hit) {
          // Cycle through parameters on each click
          const params = state.parameterSet.parameters;
          const currentIndex = selectedPart ? params.findIndex(p => p.name === selectedPart) : -1;
          const nextIndex = (currentIndex + 1) % params.length;
          const nextParam = params[nextIndex];
          
          setSelectedPart(nextParam.name);
          setSelectedPartPosition({x: e.clientX, y: e.clientY});
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (e.target !== modelViewerRef.current && selectedPart) {
        setSelectedPart(null);
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [modelViewerRef.current, selectedPart, state.parameterSet]);

  // Handle CV gestures
  const handleGesture = useCallback((gesture: GestureData) => {
    console.log('ViewerPanel received gesture:', gesture.type, gesture);
    
    if (!modelViewerRef.current) {
      console.log('No modelViewerRef');
      return;
    }

    const viewer = modelViewerRef.current;
    const orbit = viewer.getCameraOrbit();
    console.log('Current orbit:', orbit.toString());

    switch (gesture.type) {
      case 'point':
        // Move cursor/highlight objects
        if (gesture.position) {
          // Could implement hover effects here
        }
        break;

      case 'grab':
        setGrabbedObject(true);
        toastRef.current?.show({severity: 'success', detail: 'Object grabbed', life: 500});
        break;

      case 'drag':
        console.log('Processing DRAG with delta:', gesture.delta);
        if (gesture.delta) {
          // Rotate the model based on hand movement (works without grab state)
          const newTheta = orbit.theta + gesture.delta.x * 10;
          const newPhi = Math.max(0, Math.min(Math.PI, orbit.phi - gesture.delta.y * 10));
          
          console.log('Setting orbit from', orbit.theta, orbit.phi, 'to', newTheta, newPhi);
          
          orbit.theta = newTheta;
          orbit.phi = newPhi;
          viewer.cameraOrbit = orbit.toString();
          
          console.log('New orbit set:', viewer.getCameraOrbit().toString());
          
          if (axesViewerRef.current) {
            axesViewerRef.current.cameraOrbit = orbit.toString();
          }
        }
        break;

      case 'drop':
        setGrabbedObject(false);
        toastRef.current?.show({severity: 'info', detail: 'Object released', life: 500});
        break;

      case 'orbit':
        if (gesture.delta) {
          // Orbit camera around the model
          orbit.theta += gesture.delta.x * 5;
          orbit.phi -= gesture.delta.y * 5;
          orbit.phi = Math.max(0, Math.min(Math.PI, orbit.phi));
          viewer.cameraOrbit = orbit.toString();
          if (axesViewerRef.current) {
            axesViewerRef.current.cameraOrbit = orbit.toString();
          }
        }
        break;

      case 'pan':
        if (gesture.delta) {
          // Pan the camera
          const target = viewer.getCameraTarget();
          target.x -= gesture.delta.x * 3;
          target.y += gesture.delta.y * 3;
          viewer.cameraTarget = `${target.x}m ${target.y}m ${target.z}m`;
        }
        break;

      case 'zoom':
        console.log('Processing ZOOM with distance:', gesture.distance);
        if (gesture.distance !== undefined && gesture.distance !== 0) {
          // Zoom in/out based on pinch distance change
          const currentRadius = orbit.radius;
          // Increased sensitivity from 5 to 20
          const newRadius = Math.max(0.1, Math.min(10, currentRadius - gesture.distance * 20));
          
          console.log('Zooming from radius', currentRadius, 'to', newRadius, 'delta:', gesture.distance);
          
          orbit.radius = newRadius;
          viewer.cameraOrbit = orbit.toString();
          
          console.log('Applied zoom, new orbit:', viewer.getCameraOrbit().toString());
          
          if (axesViewerRef.current) {
            const axesOrbit = axesViewerRef.current.getCameraOrbit();
            axesOrbit.radius = newRadius;
            axesViewerRef.current.cameraOrbit = axesOrbit.toString();
          }
        } else {
          console.log('Zoom skipped - distance is', gesture.distance);
        }
        break;

      case 'idle':
        if (grabbedObject) {
          setGrabbedObject(false);
        }
        break;
    }
  }, [modelViewerRef.current, axesViewerRef.current, grabbedObject, toastRef]);

  return (
    <div className={className}
          style={{
              display: 'flex',
              flexDirection: 'column', 
              position: 'relative',
              flex: 1, 
              width: '100%',
              ...(style ?? {})
          }}>
      <Toast ref={toastRef} position='top-right'  />
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 0.7; }
            100% { opacity: 0.4; }
          }
        `}
      </style>

      {!loaded && cachedImageHash && 
        <img
        src={cachedImageHash.uri}
        style={{
          animation: 'pulse 1.5s ease-in-out infinite',
          position: 'absolute',
          pointerEvents: 'none',
          width: '100%',
          height: '100%'
        }} />
      }

      <model-viewer
        orientation="0deg -90deg 0deg"
        class="main-viewer"
        src={modelUri}
        style={{
          transition: 'opacity 0.5s',
          opacity: loaded ? 1 : 0,
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        camera-orbit={originalOrbit}
        interaction-prompt={interactionPrompt}
        environment-image="./skybox-lights.jpg"
        max-camera-orbit="auto 180deg auto"
        min-camera-orbit="auto 0deg auto"
        camera-controls
        ar
        ref={modelViewerRef}
      >
        <span slot="progress-bar"></span>
      </model-viewer>
      {state.view.showAxes && (
        <model-viewer
                orientation="0deg -90deg 0deg"
                src="./axes.glb"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  zIndex: 10,
                  height: '100px',
                  width: '100px',
                }}
                loading="eager"
                camera-orbit={originalOrbit}
                // interpolation-decay="0"
                environment-image="./skybox-lights.jpg"
                max-camera-orbit="auto 180deg auto"
                min-camera-orbit="auto 0deg auto"
                orbit-sensitivity="5"
                interaction-prompt="none"
                camera-controls="false"
                disable-zoom
                disable-tap 
                disable-pan
                ref={axesViewerRef}
        >
          <span slot="progress-bar"></span>
        </model-viewer>
      )}

      {/* Selected Part Parameter Display */}
      {selectedPart && state.parameterSet?.parameters && (
        <div
          style={{
            position: 'fixed',
            left: `${selectedPartPosition.x + 15}px`,
            top: `${selectedPartPosition.y + 15}px`,
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '16px',
            minWidth: '250px',
            zIndex: 1000,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
            fontSize: '0.9rem',
            color: '#ffffff'
          }}
        >
          {(() => {
            const param = state.parameterSet.parameters.find(p => p.name === selectedPart);
            if (!param) return null;
            
            return (
              <>
                <div style={{
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: '#4CAF50',
                  fontSize: '1rem',
                  borderBottom: '1px solid #4CAF50',
                  paddingBottom: '8px'
                }}>
                  Selected Parameter
                </div>
                <div style={{
                  fontWeight: 600,
                  color: '#ffffff',
                  marginBottom: '8px',
                  fontSize: '1.1rem'
                }}>
                  {param.name}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#aaa',
                  marginBottom: '8px'
                }}>
                  <strong>Type:</strong> {param.type}
                  {param.type === 'number' && 'min' in param && param.min !== undefined && (
                    <span> • <strong>Range:</strong> {param.min} - {param.max}</span>
                  )}
                </div>
                {param.caption && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#bbb',
                    fontStyle: 'italic',
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px'
                  }}>
                    {param.caption}
                  </div>
                )}
                <div style={{
                  fontSize: '0.85rem',
                  color: '#888',
                  marginTop: '8px'
                }}>
                  <strong>Default:</strong> {JSON.stringify(param.initial)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#666',
                  marginTop: '12px',
                  fontStyle: 'italic',
                  textAlign: 'center'
                }}>
                  Click again to cycle through parameters
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* CV Control Panel */}
      <CVControlPanel 
        visible={state.view.cvControlVisible ?? false}
        onGesture={handleGesture}
      />
    </div>
  )
}

// Type definitions for MediaPipe Hands
declare module '@mediapipe/hands' {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface Results {
    image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
    multiHandLandmarks?: NormalizedLandmark[][];
    multiHandWorldLandmarks?: NormalizedLandmark[][];
    multiHandedness?: Array<{
      index: number;
      score: number;
      label: string;
    }>;
  }

  export interface HandsOptions {
    locateFile?: (file: string) => string;
    maxNumHands?: number;
    modelComplexity?: 0 | 1;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class Hands {
    constructor(options: { locateFile: (file: string) => string });
    setOptions(options: HandsOptions): void;
    onResults(callback: (results: Results) => void): void;
    send(inputs: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
    close(): void;
  }

  export const HAND_CONNECTIONS: Array<[number, number]>;
}

declare module '@mediapipe/camera_utils' {
  export interface CameraOptions {
    onFrame: () => Promise<void>;
    width: number;
    height: number;
  }

  export class Camera {
    constructor(videoElement: HTMLVideoElement, options: CameraOptions);
    start(): Promise<void>;
    stop(): void;
  }
}

declare module '@mediapipe/drawing_utils' {
  export interface DrawingOptions {
    color?: string;
    lineWidth?: number;
    radius?: number;
    fillColor?: string;
  }

  export function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{ x: number; y: number; z?: number }>,
    connections: Array<[number, number]>,
    options?: DrawingOptions
  ): void;

  export function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{ x: number; y: number; z?: number }>,
    options?: DrawingOptions
  ): void;
}

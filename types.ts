
export interface Identity {
  id: string;
  name: string;
  imageUrl: string;
  embeddingStatus: 'ready' | 'processing' | 'error';
}

export enum CameraStatus {
  INACTIVE = 'INACTIVE',
  LOADING = 'LOADING',
  ACTIVE = 'ACTIVE',
  SWAPPING = 'SWAPPING'
}

export interface ProcessingState {
  isFaceDetected: boolean;
  isCalibrated: boolean;
  isVirtualCamOutputActive: boolean;
  framerate: number;
}

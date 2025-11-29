declare module '@capacitor/camera' {
  export interface CameraOptions {
    quality?: number;
    allowEditing?: boolean;
    resultType?: CameraResultType;
    source?: CameraSource;
    saveToGallery?: boolean;
    correctOrientation?: boolean;
    width?: number;
    height?: number;
    preserveAspectRatio?: boolean;
    direction?: CameraDirection;
    presentationStyle?: 'fullscreen' | 'popover';
    webUseInput?: boolean;
    promptLabelHeader?: string;
    promptLabelCancel?: string;
    promptLabelPhoto?: string;
    promptLabelPicture?: string;
  }

  export interface Photo {
    base64String?: string;
    dataUrl?: string;
    path?: string;
    webPath?: string;
    exif?: any;
    format?: string;
    saved?: boolean;
  }

  export enum CameraResultType {
    Uri = 'uri',
    Base64 = 'base64',
    DataUrl = 'dataUrl'
  }

  export enum CameraSource {
    Prompt = 'PROMPT',
    Camera = 'CAMERA',
    Photos = 'PHOTOS'
  }

  export enum CameraDirection {
    Rear = 'REAR',
    Front = 'FRONT'
  }

  export interface CameraPlugin {
    getPhoto(options: CameraOptions): Promise<Photo>;
    pickImages(options: GalleryOptions): Promise<GalleryPhotos>;
    checkPermissions(): Promise<PermissionStatus>;
    requestPermissions(permissions?: CameraPluginPermissions): Promise<PermissionStatus>;
  }

  export interface GalleryOptions {
    quality?: number;
    width?: number;
    height?: number;
    correctOrientation?: boolean;
    presentationStyle?: 'fullscreen' | 'popover';
    limit?: number;
  }

  export interface GalleryPhotos {
    photos: GalleryPhoto[];
  }

  export interface GalleryPhoto {
    path?: string;
    webPath?: string;
    exif?: any;
    format?: string;
  }

  export interface PermissionStatus {
    camera: CameraPermissionState;
    photos: CameraPermissionState;
  }

  export type CameraPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' | 'limited';

  export interface CameraPluginPermissions {
    permissions: CameraPermissionType[];
  }

  export type CameraPermissionType = 'camera' | 'photos';

  export const Camera: CameraPlugin;
}

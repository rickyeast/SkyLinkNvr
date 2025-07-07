import { z } from "zod";

export interface CameraCapabilities {
  resolutions: string[];
  frameRates: number[];
  codecs: string[];
  streamProfiles: StreamProfile[];
  ptzSupport: boolean;
  audioSupport: boolean;
  irSupport: boolean;
  motionDetection: boolean;
  privacyMask: boolean;
  digitalZoom: boolean;
  manufacturer: string;
  model: string;
  firmwareVersion?: string;
  maxStreams: number;
}

export interface StreamProfile {
  name: string;
  resolution: string;
  fps: number;
  codec: string;
  rtspUrl: string;
  quality: 'low' | 'medium' | 'high';
}

export interface CameraTemplate {
  id: string;
  manufacturer: string;
  model: string;
  capabilities: CameraCapabilities;
  defaultSettings: {
    resolution: string;
    fps: number;
    codec: string;
    rtspUrl: string;
    onvifUrl: string;
    port: number;
  };
  createdAt: Date;
  usageCount: number;
}

export const cameraTemplateSchema = z.object({
  manufacturer: z.string(),
  model: z.string(),
  capabilities: z.object({
    resolutions: z.array(z.string()),
    frameRates: z.array(z.number()),
    codecs: z.array(z.string()),
    streamProfiles: z.array(z.object({
      name: z.string(),
      resolution: z.string(),
      fps: z.number(),
      codec: z.string(),
      rtspUrl: z.string(),
      quality: z.enum(['low', 'medium', 'high'])
    })),
    ptzSupport: z.boolean(),
    audioSupport: z.boolean(),
    irSupport: z.boolean(),
    motionDetection: z.boolean(),
    privacyMask: z.boolean(),
    digitalZoom: z.boolean(),
    manufacturer: z.string(),
    model: z.string(),
    firmwareVersion: z.string().optional(),
    maxStreams: z.number()
  }),
  defaultSettings: z.object({
    resolution: z.string(),
    fps: z.number(),
    codec: z.string(),
    rtspUrl: z.string(),
    onvifUrl: z.string(),
    port: z.number()
  })
});

export type InsertCameraTemplate = z.infer<typeof cameraTemplateSchema>;
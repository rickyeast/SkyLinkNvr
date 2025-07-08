import { Camera } from '@shared/schema';
import { recordingService } from './recording';
import { storage } from '../storage';

interface CodeProjectAIResponse {
  success: boolean;
  predictions: Array<{
    label: string;
    confidence: number;
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  }>;
}

interface MotionDetectionResult {
  cameraId: number;
  detected: boolean;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  eventType: string;
}

class MotionDetectionService {
  private detectionIntervals = new Map<number, NodeJS.Timeout>();
  private codeProjectAIUrl: string;
  private apiKey: string;

  constructor() {
    this.codeProjectAIUrl = process.env.CODEPROJECT_AI_URL || 'http://localhost:32168';
    this.apiKey = process.env.CODEPROJECT_AI_KEY || '';
  }

  async enableMotionDetection(camera: Camera): Promise<void> {
    // Clear existing detection interval
    this.disableMotionDetection(camera.id);

    const settings = await storage.getRecordingSettings(camera.id);
    if (!settings?.motionTriggered) {
      return;
    }

    // Start periodic motion detection
    const interval = setInterval(async () => {
      await this.performMotionDetection(camera);
    }, 3000); // Check every 3 seconds

    this.detectionIntervals.set(camera.id, interval);
    console.log(`Motion detection enabled for camera ${camera.id}`);
  }

  disableMotionDetection(cameraId: number): void {
    const interval = this.detectionIntervals.get(cameraId);
    if (interval) {
      clearInterval(interval);
      this.detectionIntervals.delete(cameraId);
      console.log(`Motion detection disabled for camera ${cameraId}`);
    }
  }

  private async performMotionDetection(camera: Camera): Promise<MotionDetectionResult | null> {
    try {
      // Capture frame from camera
      const frameBuffer = await this.captureFrame(camera);
      if (!frameBuffer) {
        return null;
      }

      // Send frame to CodeProjectAI for analysis
      const analysis = await this.analyzeFrame(frameBuffer);
      if (!analysis.success) {
        return null;
      }

      // Process detection results
      const motionResult = this.processDetectionResults(camera.id, analysis);
      
      if (motionResult.detected) {
        // Trigger recording service
        await recordingService.handleMotionDetection({
          cameraId: camera.id,
          confidence: motionResult.confidence,
          boundingBox: motionResult.boundingBox!,
          timestamp: new Date()
        });
      }

      return motionResult;

    } catch (error) {
      console.error(`Motion detection failed for camera ${camera.id}:`, error);
      return null;
    }
  }

  private async captureFrame(camera: Camera): Promise<Buffer | null> {
    try {
      // Use ffmpeg to capture a single frame from RTSP stream
      const ffmpeg = require('fluent-ffmpeg');
      const rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.ipAddress}:${camera.port}/stream`;

      return new Promise((resolve, reject) => {
        const frames: Buffer[] = [];

        ffmpeg(rtspUrl)
          .inputOptions([
            '-rtsp_transport tcp',
            '-analyzeduration 1000000',
            '-probesize 1000000'
          ])
          .outputOptions([
            '-vframes 1',
            '-f image2pipe',
            '-pix_fmt rgb24',
            '-vcodec rawvideo'
          ])
          .on('error', (err: Error) => {
            console.error(`Frame capture error: ${err.message}`);
            reject(err);
          })
          .on('end', () => {
            if (frames.length > 0) {
              resolve(Buffer.concat(frames));
            } else {
              resolve(null);
            }
          })
          .pipe()
          .on('data', (chunk: Buffer) => {
            frames.push(chunk);
          });
      });

    } catch (error) {
      console.error('Failed to capture frame:', error);
      return null;
    }
  }

  private async analyzeFrame(frameBuffer: Buffer): Promise<CodeProjectAIResponse> {
    try {
      const formData = new FormData();
      formData.append('image', new Blob([frameBuffer]), 'frame.jpg');

      const response = await fetch(`${this.codeProjectAIUrl}/v1/vision/detection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`CodeProjectAI API error: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to analyze frame with CodeProjectAI:', error);
      return { success: false, predictions: [] };
    }
  }

  private processDetectionResults(cameraId: number, analysis: CodeProjectAIResponse): MotionDetectionResult {
    const result: MotionDetectionResult = {
      cameraId,
      detected: false,
      confidence: 0,
      eventType: 'motion'
    };

    if (!analysis.success || analysis.predictions.length === 0) {
      return result;
    }

    // Find the highest confidence detection
    let highestConfidence = 0;
    let bestDetection = null;

    for (const prediction of analysis.predictions) {
      if (prediction.confidence > highestConfidence) {
        highestConfidence = prediction.confidence;
        bestDetection = prediction;
      }
    }

    if (bestDetection && highestConfidence > 0.3) { // Minimum threshold
      result.detected = true;
      result.confidence = highestConfidence;
      result.eventType = bestDetection.label;
      result.boundingBox = {
        x: bestDetection.x_min,
        y: bestDetection.y_min,
        width: bestDetection.x_max - bestDetection.x_min,
        height: bestDetection.y_max - bestDetection.y_min
      };
    }

    return result;
  }

  async getDetectionCapabilities(): Promise<string[]> {
    try {
      const response = await fetch(`${this.codeProjectAIUrl}/v1/vision/detection/list`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`CodeProjectAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || ['person', 'vehicle', 'animal'];

    } catch (error) {
      console.error('Failed to get detection capabilities:', error);
      return ['person', 'vehicle', 'animal']; // Fallback capabilities
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.codeProjectAIUrl}/v1/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;

    } catch (error) {
      console.error('CodeProjectAI connection test failed:', error);
      return false;
    }
  }

  async updateConfiguration(url: string, apiKey: string): Promise<void> {
    this.codeProjectAIUrl = url;
    this.apiKey = apiKey;

    // Update environment variables
    process.env.CODEPROJECT_AI_URL = url;
    process.env.CODEPROJECT_AI_KEY = apiKey;

    console.log('CodeProjectAI configuration updated');
  }

  getActiveDetections(): number[] {
    return Array.from(this.detectionIntervals.keys());
  }
}

export const motionDetectionService = new MotionDetectionService();
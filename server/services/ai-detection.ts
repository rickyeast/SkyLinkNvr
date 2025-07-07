import { Camera, InsertAiDetection } from "@shared/schema";
import { storage } from "../storage";

export interface DetectionResult {
  type: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class AiDetectionService {
  private detectionIntervals = new Map<number, NodeJS.Timeout>();

  async enableDetection(camera: Camera): Promise<void> {
    if (this.detectionIntervals.has(camera.id)) {
      return; // Already enabled
    }

    const interval = setInterval(async () => {
      try {
        await this.runDetection(camera);
      } catch (error) {
        console.error(`Detection failed for camera ${camera.id}:`, error);
      }
    }, 30000); // Run every 30 seconds

    this.detectionIntervals.set(camera.id, interval);
    console.log(`Enabled AI detection for camera ${camera.id}`);
  }

  async disableDetection(cameraId: number): Promise<void> {
    const interval = this.detectionIntervals.get(cameraId);
    if (interval) {
      clearInterval(interval);
      this.detectionIntervals.delete(cameraId);
      console.log(`Disabled AI detection for camera ${cameraId}`);
    }
  }

  private async runDetection(camera: Camera): Promise<void> {
    // Mock implementation - replace with actual AI detection
    // In production, integrate with Code Project AI, OpenAI Vision, or custom YOLO server
    
    const detectionTypes = camera.aiDetectionTypes as string[] || [];
    if (detectionTypes.length === 0) {
      return;
    }

    // Simulate random detections for demo purposes
    const shouldDetect = Math.random() > 0.7; // 30% chance of detection
    if (!shouldDetect) {
      return;
    }

    const randomType = detectionTypes[Math.floor(Math.random() * detectionTypes.length)];
    const confidence = 0.7 + Math.random() * 0.3; // 70-100% confidence
    
    const detection: InsertAiDetection = {
      cameraId: camera.id,
      detectionType: randomType,
      confidence: confidence.toString(),
      boundingBox: {
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600),
        width: 100 + Math.floor(Math.random() * 200),
        height: 100 + Math.floor(Math.random() * 200),
      },
      thumbnailPath: `/thumbnails/${camera.id}_${Date.now()}.jpg`,
    };

    await storage.createDetection(detection);
    console.log(`Detected ${randomType} on camera ${camera.id} with ${Math.round(confidence * 100)}% confidence`);
  }

  async analyzeImage(cameraId: number, imagePath: string): Promise<DetectionResult[]> {
    // Mock implementation - replace with actual image analysis
    const mockResults: DetectionResult[] = [
      {
        type: "person",
        confidence: 0.92,
        boundingBox: { x: 150, y: 200, width: 120, height: 300 },
      },
    ];

    return mockResults;
  }

  async getDetectionCapabilities(): Promise<string[]> {
    // Return supported detection types
    return ["person", "car", "truck", "bicycle", "motorcycle", "bus", "cat", "dog"];
  }
}

export const aiDetectionService = new AiDetectionService();

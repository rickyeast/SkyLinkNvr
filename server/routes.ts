import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCameraSchema, insertRecordingSchema, insertAiDetectionSchema } from "@shared/schema";
import { onvifService } from "./services/onvif";
import { streamingService } from "./services/streaming";
import { aiDetectionService } from "./services/ai-detection";

export async function registerRoutes(app: Express): Promise<Server> {
  // Camera routes
  app.get("/api/cameras", async (req, res) => {
    try {
      const cameras = await storage.getAllCameras();
      res.json(cameras);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cameras" });
    }
  });

  app.get("/api/cameras/:id", async (req, res) => {
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera) {
        return res.status(404).json({ error: "Camera not found" });
      }
      res.json(camera);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch camera" });
    }
  });

  app.post("/api/cameras", async (req, res) => {
    try {
      const validatedData = insertCameraSchema.parse(req.body);
      const camera = await storage.createCamera(validatedData);
      
      // Test ONVIF connection
      try {
        await onvifService.testConnection(camera.ipAddress, camera.onvifUrl || "");
        await storage.updateCameraStatus(camera.id, "online");
      } catch (error) {
        await storage.updateCameraStatus(camera.id, "error");
      }

      res.status(201).json(camera);
    } catch (error) {
      res.status(400).json({ error: "Invalid camera data" });
    }
  });

  app.put("/api/cameras/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCameraSchema.partial().parse(req.body);
      const camera = await storage.updateCamera(id, validatedData);
      
      if (!camera) {
        return res.status(404).json({ error: "Camera not found" });
      }

      res.json(camera);
    } catch (error) {
      res.status(400).json({ error: "Invalid camera data" });
    }
  });

  app.delete("/api/cameras/:id", async (req, res) => {
    try {
      const success = await storage.deleteCamera(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Camera not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete camera" });
    }
  });

  // Camera discovery
  app.post("/api/cameras/discover", async (req, res) => {
    try {
      const devices = await onvifService.discoverDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to discover cameras" });
    }
  });

  // Stream management
  app.post("/api/cameras/:id/stream/start", async (req, res) => {
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera) {
        return res.status(404).json({ error: "Camera not found" });
      }

      const streamUrl = await streamingService.startStream(camera);
      res.json({ streamUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to start stream" });
    }
  });

  app.post("/api/cameras/:id/stream/stop", async (req, res) => {
    try {
      const success = streamingService.stopStream(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Stream not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to stop stream" });
    }
  });

  // Recording routes
  app.get("/api/recordings", async (req, res) => {
    try {
      const cameraId = req.query.cameraId ? parseInt(req.query.cameraId as string) : undefined;
      if (cameraId) {
        const recordings = await storage.getRecordingsByCamera(cameraId);
        res.json(recordings);
      } else {
        res.status(400).json({ error: "Camera ID required" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  app.post("/api/recordings", async (req, res) => {
    try {
      const validatedData = insertRecordingSchema.parse(req.body);
      const recording = await storage.createRecording(validatedData);
      res.status(201).json(recording);
    } catch (error) {
      res.status(400).json({ error: "Invalid recording data" });
    }
  });

  app.delete("/api/recordings/:id", async (req, res) => {
    try {
      const success = await storage.deleteRecording(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Recording not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  // AI Detection routes
  app.get("/api/detections", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const detections = await storage.getRecentDetections(limit);
      res.json(detections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detections" });
    }
  });

  app.get("/api/detections/stats", async (req, res) => {
    try {
      const stats = await storage.getDetectionStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detection stats" });
    }
  });

  app.post("/api/detections", async (req, res) => {
    try {
      const validatedData = insertAiDetectionSchema.parse(req.body);
      const detection = await storage.createDetection(validatedData);
      res.status(201).json(detection);
    } catch (error) {
      res.status(400).json({ error: "Invalid detection data" });
    }
  });

  // System stats
  app.get("/api/system/stats", async (req, res) => {
    try {
      const cameras = await storage.getAllCameras();
      const activeCameras = cameras.filter(c => c.status === "online").length;
      const recordingCameras = cameras.filter(c => c.isRecording).length;
      const detectionStats = await storage.getDetectionStats();
      const latestHealth = await storage.getLatestSystemHealth();

      res.json({
        activeCameras,
        recordingCameras,
        totalCameras: cameras.length,
        storageUsed: "2.4 TB", // This would come from actual storage monitoring
        aiDetections: detectionStats.today,
        systemHealth: latestHealth,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system stats" });
    }
  });

  app.get("/api/system/health", async (req, res) => {
    try {
      const health = await storage.getLatestSystemHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system health" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCameraSchema, insertRecordingSchema, insertAiDetectionSchema, insertCameraTemplateSchema } from "@shared/schema";
import { onvifService } from "./services/onvif";
import { streamingService } from "./services/streaming";
import { aiDetectionService } from "./services/ai-detection";
import { recordingService } from "./services/recording";

export async function registerRoutes(app: Express): Promise<Server> {
  // Camera discovery (must be before parameterized routes)
  const handleCameraDiscovery = async (req: any, res: any) => {
    try {
      console.log("Starting camera discovery...");
      const devices = await onvifService.discoverDevices();
      console.log(`Found ${devices.length} potential cameras`);
      res.json(devices);
    } catch (error) {
      console.error("Camera discovery error:", error);
      res.status(500).json({ error: "Failed to discover cameras", details: error?.message || String(error) });
    }
  };

  app.get("/api/cameras/discover", handleCameraDiscovery);
  app.post("/api/cameras/discover", handleCameraDiscovery);

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



  // Camera connection test and capability detection
  app.post("/api/cameras/test", async (req, res) => {
    try {
      const { ipAddress, username, password } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      const result = await onvifService.testCameraConnection(ipAddress, username, password);
      
      if (result.success && result.capabilities) {
        // Check if we have a template for this camera model
        const existingTemplate = await storage.getCameraTemplateByModel(
          result.capabilities.manufacturer,
          result.capabilities.model
        );

        if (!existingTemplate) {
          // Create new template
          const templateData = {
            manufacturer: result.capabilities.manufacturer,
            model: result.capabilities.model,
            capabilities: result.capabilities,
            defaultSettings: {
              resolution: result.capabilities.streamProfiles[0]?.resolution || "1920x1080",
              fps: result.capabilities.streamProfiles[0]?.fps || 30,
              codec: result.capabilities.streamProfiles[0]?.codec || "H.264",
              rtspUrl: result.capabilities.streamProfiles[0]?.rtspUrl || `rtsp://${ipAddress}:554/Streaming/Channels/101`,
              onvifUrl: `http://${ipAddress}/onvif/device_service`,
              port: 554
            }
          };

          await storage.createCameraTemplate(templateData);
        } else {
          // Update usage count for existing template
          await storage.updateCameraTemplateUsage(existingTemplate.id);
        }
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to test camera connection" });
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
      const { cameraId, triggerType } = req.query;
      
      let recordings;
      if (triggerType && triggerType !== 'all') {
        recordings = await storage.getRecordingsByTriggerType(triggerType as string);
      } else if (cameraId) {
        recordings = await storage.getRecordingsByCamera(parseInt(cameraId as string));
      } else {
        recordings = await storage.getAllRecordings();
      }
      
      res.json(recordings);
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
      // Get actual system metrics
      const os = await import('os');
      const fs = await import('fs/promises');
      
      let cpuUsage = "0";
      let memoryUsage = "0";
      let storageUsage = "15";
      let uptime = Math.floor(os.uptime() / 3600);
      
      // Try to read from host /proc if available (Docker host network mode)
      const hostProcPath = process.env.HOST_PROC || '/proc';
      const hostSysPath = process.env.HOST_SYS || '/sys';
      
      try {
        console.log(`Attempting to read host system stats from: ${hostProcPath}`);
        
        // Try to get memory info from host proc
        const meminfoPath = `${hostProcPath}/meminfo`;
        try {
          await fs.access(meminfoPath);
          const meminfo = await fs.readFile(meminfoPath, 'utf8');
          const totalMatch = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
          const availableMatch = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/) || meminfo.match(/MemFree:\s+(\d+)\s+kB/);
          
          if (totalMatch && availableMatch) {
            const totalMem = parseInt(totalMatch[1]) * 1024; // Convert to bytes
            const availableMem = parseInt(availableMatch[1]) * 1024;
            const usedMem = totalMem - availableMem;
            memoryUsage = ((usedMem / totalMem) * 100).toFixed(1);
            console.log(`Host memory usage: ${memoryUsage}% (${Math.round(usedMem / 1024 / 1024 / 1024 * 10) / 10}GB used of ${Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10}GB total)`);
          } else {
            console.log('Could not parse host memory info, using fallback');
            throw new Error('Memory parsing failed');
          }
        } catch (memError) {
          console.log(`Host memory stats not available (${meminfoPath}), using container stats:`, memError.message);
          // Fall back to os module
          const totalMem = os.totalmem();
          const freeMem = os.freemem();
          memoryUsage = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);
          console.log(`Container memory usage: ${memoryUsage}%`);
        }
        
        // Try to get CPU usage from host proc
        const statPath = `${hostProcPath}/stat`;
        try {
          await fs.access(statPath);
          const stat = await fs.readFile(statPath, 'utf8');
          const cpuLine = stat.split('\n')[0];
          const cpuTimes = cpuLine.split(/\s+/).slice(1).map(Number);
          
          if (cpuTimes.length >= 8) {
            const totalTime = cpuTimes.reduce((sum, time) => sum + time, 0);
            const idleTime = cpuTimes[3] + cpuTimes[4]; // idle + iowait
            
            if (totalTime > 0) {
              cpuUsage = (((totalTime - idleTime) / totalTime) * 100).toFixed(1);
              console.log(`Host CPU usage: ${cpuUsage}%`);
            }
          } else {
            throw new Error('Invalid CPU stats format');
          }
        } catch (cpuError) {
          console.log(`Host CPU stats not available (${statPath}), using container stats:`, cpuError.message);
          // Fall back to simple load average or basic calculation
          try {
            const loadavgPath = `${hostProcPath}/loadavg`;
            await fs.access(loadavgPath);
            const loadavg = await fs.readFile(loadavgPath, 'utf8');
            const load1min = parseFloat(loadavg.split(' ')[0]);
            // Estimate CPU usage from load average (rough approximation)
            cpuUsage = Math.min(load1min * 25, 100).toFixed(1);
            console.log(`Host CPU estimated from load average: ${cpuUsage}% (load: ${load1min})`);
          } catch (loadError) {
            // Final fallback to os module calculation
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;
            
            cpus.forEach(cpu => {
              for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
              }
              totalIdle += cpu.times.idle;
            });
            
            if (totalTick > 0) {
              cpuUsage = ((1 - totalIdle / totalTick) * 100).toFixed(1);
              console.log(`Container CPU usage: ${cpuUsage}%`);
            }
          }
        }
        
        // Try to get storage usage using df command or disk stats
        try {
          const { spawn } = await import('child_process');
          const dfOutput = await new Promise<string>((resolve, reject) => {
            const dfProcess = spawn('df', ['-h', '/']);
            let output = '';
            
            dfProcess.stdout.on('data', (data) => {
              output += data.toString();
            });
            
            dfProcess.on('close', (code) => {
              if (code === 0) {
                resolve(output);
              } else {
                reject(new Error(`df command failed with code ${code}`));
              }
            });
            
            dfProcess.on('error', reject);
          });
          
          // Parse df output to get usage percentage
          const lines = dfOutput.trim().split('\n');
          if (lines.length >= 2) {
            const rootLine = lines[1];
            const match = rootLine.match(/(\d+)%/);
            if (match) {
              storageUsage = match[1];
              console.log(`Host storage usage: ${storageUsage}%`);
            }
          }
        } catch (storageError) {
          console.log('Could not get host storage stats, using default:', storageError.message);
          storageUsage = "15"; // fallback
        }
        
        // Try to get uptime from host
        const uptimePath = `${hostProcPath}/uptime`;
        try {
          await fs.access(uptimePath);
          const uptimeData = await fs.readFile(uptimePath, 'utf8');
          const uptimeSeconds = parseFloat(uptimeData.split(' ')[0]);
          uptime = Math.floor(uptimeSeconds / 3600);
          console.log(`Host uptime: ${uptime} hours`);
        } catch (uptimeError) {
          console.log(`Host uptime not available (${uptimePath}), using container uptime:`, uptimeError.message);
          uptime = Math.floor(os.uptime() / 3600);
        }
        
      } catch (error) {
        console.error("Failed to read system stats:", error.message);
        // Ensure we have some values even if everything fails
        if (cpuUsage === "0") {
          const cpus = os.cpus();
          let totalIdle = 0;
          let totalTick = 0;
          
          cpus.forEach(cpu => {
            for (const type in cpu.times) {
              totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
          });
          
          if (totalTick > 0) {
            cpuUsage = ((1 - totalIdle / totalTick) * 100).toFixed(1);
          }
        }
        
        if (memoryUsage === "0") {
          const totalMem = os.totalmem();
          const freeMem = os.freemem();
          memoryUsage = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);
        }
        // Use fallback values calculated above
      }
      
      // Create current health record (convert network values to bytes as integers)
      const healthData = {
        cpuUsage,
        memoryUsage,
        storageUsage,
        networkIn: 1200000, // bytes (1.2 MB)
        networkOut: 800000, // bytes (0.8 MB)
        uptime,
      };
      
      // Save to database
      await storage.createSystemHealth(healthData);
      
      res.json({
        id: 1,
        ...healthData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("System health error:", error);
      res.status(500).json({ error: "Failed to fetch system health" });
    }
  });

  // Camera Templates
  app.get("/api/camera-templates", async (req, res) => {
    try {
      const templates = await storage.getCameraTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch camera templates" });
    }
  });

  app.get("/api/camera-templates/:id", async (req, res) => {
    try {
      const template = await storage.getCameraTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch camera template" });
    }
  });

  // Recording control routes
  app.get("/api/recording/active", async (req, res) => {
    try {
      const activeRecordings = await recordingService.getActiveRecordings();
      res.json(activeRecordings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get active recordings" });
    }
  });

  app.post("/api/recording/start/:cameraId", async (req, res) => {
    try {
      const cameraId = parseInt(req.params.cameraId);
      const recording = await recordingService.startRecording(cameraId, 'manual');
      if (recording) {
        res.json({ success: true, recording });
      } else {
        res.status(400).json({ error: "Failed to start recording" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start recording" });
    }
  });

  app.post("/api/recording/stop/:cameraId", async (req, res) => {
    try {
      const cameraId = parseInt(req.params.cameraId);
      const stopped = await recordingService.stopRecording(cameraId);
      res.json({ success: stopped });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop recording" });
    }
  });

  app.get("/api/recording/config/:cameraId", async (req, res) => {
    try {
      const cameraId = parseInt(req.params.cameraId);
      const settings = await storage.getRecordingSettings(cameraId);
      
      // Return default settings if none exist
      if (!settings) {
        const defaultSettings = {
          cameraId,
          continuousRecording: false,
          motionTriggered: false,
          scheduledRecording: false,
          motionSensitivity: 0.7,
          preRecordSeconds: 5,
          postRecordSeconds: 10,
          maxClipDuration: 300,
          retentionDays: 30,
          schedule: []
        };
        res.json(defaultSettings);
      } else {
        res.json(settings);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get recording settings" });
    }
  });

  app.put("/api/recording/config/:cameraId", async (req, res) => {
    try {
      const cameraId = parseInt(req.params.cameraId);
      const settings = req.body;
      
      const existing = await storage.getRecordingSettings(cameraId);
      if (existing) {
        const updated = await storage.updateRecordingSettings(cameraId, settings);
        res.json(updated);
      } else {
        const created = await storage.createRecordingSettings({ ...settings, cameraId });
        res.json(created);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update recording settings" });
    }
  });

  app.get("/api/recording/motion-events/recording/:recordingId", async (req, res) => {
    try {
      const recordingId = parseInt(req.params.recordingId);
      const events = await storage.getMotionEventsByRecording(recordingId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to get motion events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

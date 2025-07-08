import { Router } from 'express';
import { storage } from '../storage';
import { recordingService } from '../services/recording';
import { motionDetectionService } from '../services/motion-detection';
import { insertRecordingSettingsSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get recording settings for a camera
router.get('/config/:cameraId', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.cameraId);
    if (isNaN(cameraId)) {
      return res.status(400).json({ error: 'Invalid camera ID' });
    }

    let settings = await storage.getRecordingSettings(cameraId);
    
    // Create default settings if none exist
    if (!settings) {
      const defaultSettings = {
        cameraId,
        continuousRecording: false,
        motionTriggered: false,
        scheduledRecording: false,
        motionSensitivity: 0.5,
        preRecordSeconds: 5,
        postRecordSeconds: 10,
        maxClipDuration: 300,
        retentionDays: 30,
        schedule: []
      };
      
      settings = await storage.createRecordingSettings(defaultSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error('Failed to get recording settings:', error);
    res.status(500).json({ error: 'Failed to get recording settings' });
  }
});

// Update recording settings for a camera
router.put('/config/:cameraId', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.cameraId);
    if (isNaN(cameraId)) {
      return res.status(400).json({ error: 'Invalid camera ID' });
    }

    // Validate request body
    const settingsSchema = insertRecordingSettingsSchema.extend({
      schedule: z.array(z.object({
        day: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        enabled: z.boolean()
      })).optional()
    });

    const validatedSettings = settingsSchema.parse(req.body);

    // Check if settings exist
    let settings = await storage.getRecordingSettings(cameraId);
    
    if (settings) {
      // Update existing settings
      settings = await storage.updateRecordingSettings(cameraId, validatedSettings);
    } else {
      // Create new settings
      settings = await storage.createRecordingSettings({
        cameraId,
        ...validatedSettings
      });
    }

    // Update recording service configuration
    await recordingService.updateRecordingSettings(cameraId, settings);

    // Enable/disable motion detection based on settings
    const camera = await storage.getCamera(cameraId);
    if (camera) {
      if (settings.motionTriggered) {
        await motionDetectionService.enableMotionDetection(camera);
      } else {
        motionDetectionService.disableMotionDetection(cameraId);
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('Failed to update recording settings:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid settings data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update recording settings' });
  }
});

// Start manual recording
router.post('/start/:cameraId', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.cameraId);
    if (isNaN(cameraId)) {
      return res.status(400).json({ error: 'Invalid camera ID' });
    }

    const recording = await recordingService.startRecording(cameraId, 'manual');
    
    if (recording) {
      res.json({ success: true, recording });
    } else {
      res.status(400).json({ error: 'Failed to start recording' });
    }
  } catch (error) {
    console.error('Failed to start recording:', error);
    res.status(500).json({ error: 'Failed to start recording' });
  }
});

// Stop recording
router.post('/stop/:cameraId', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.cameraId);
    if (isNaN(cameraId)) {
      return res.status(400).json({ error: 'Invalid camera ID' });
    }

    const success = await recordingService.stopRecording(cameraId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'No active recording found' });
    }
  } catch (error) {
    console.error('Failed to stop recording:', error);
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

// Get active recordings
router.get('/active', async (req, res) => {
  try {
    const activeRecordings = await recordingService.getActiveRecordings();
    res.json(activeRecordings.map(ar => ({
      cameraId: ar.cameraId,
      recording: ar.recording,
      startTime: ar.startTime,
      triggerType: ar.triggerType
    })));
  } catch (error) {
    console.error('Failed to get active recordings:', error);
    res.status(500).json({ error: 'Failed to get active recordings' });
  }
});

// Get recordings by trigger type
router.get('/by-trigger/:triggerType', async (req, res) => {
  try {
    const { triggerType } = req.params;
    const recordings = await storage.getRecordingsByTriggerType(triggerType);
    res.json(recordings);
  } catch (error) {
    console.error('Failed to get recordings by trigger type:', error);
    res.status(500).json({ error: 'Failed to get recordings by trigger type' });
  }
});

// Get motion events for a camera
router.get('/motion-events/:cameraId', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.cameraId);
    if (isNaN(cameraId)) {
      return res.status(400).json({ error: 'Invalid camera ID' });
    }

    const events = await storage.getMotionEventsByCamera(cameraId);
    res.json(events);
  } catch (error) {
    console.error('Failed to get motion events:', error);
    res.status(500).json({ error: 'Failed to get motion events' });
  }
});

// Get motion events for a recording
router.get('/motion-events/recording/:recordingId', async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    if (isNaN(recordingId)) {
      return res.status(400).json({ error: 'Invalid recording ID' });
    }

    const events = await storage.getMotionEventsByRecording(recordingId);
    res.json(events);
  } catch (error) {
    console.error('Failed to get motion events for recording:', error);
    res.status(500).json({ error: 'Failed to get motion events for recording' });
  }
});

// Test motion detection for a camera
router.post('/test-motion/:cameraId', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.cameraId);
    if (isNaN(cameraId)) {
      return res.status(400).json({ error: 'Invalid camera ID' });
    }

    const camera = await storage.getCamera(cameraId);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Perform a single motion detection test
    const result = await motionDetectionService.performMotionDetection(camera);
    res.json(result);
  } catch (error) {
    console.error('Failed to test motion detection:', error);
    res.status(500).json({ error: 'Failed to test motion detection' });
  }
});

// Get CodeProjectAI detection capabilities
router.get('/detection-capabilities', async (req, res) => {
  try {
    const capabilities = await motionDetectionService.getDetectionCapabilities();
    res.json({ capabilities });
  } catch (error) {
    console.error('Failed to get detection capabilities:', error);
    res.status(500).json({ error: 'Failed to get detection capabilities' });
  }
});

// Test CodeProjectAI connection
router.get('/test-ai-connection', async (req, res) => {
  try {
    const isConnected = await motionDetectionService.testConnection();
    res.json({ connected: isConnected });
  } catch (error) {
    console.error('Failed to test AI connection:', error);
    res.status(500).json({ error: 'Failed to test AI connection' });
  }
});

// Manual cleanup of old recordings
router.post('/cleanup', async (req, res) => {
  try {
    await recordingService.cleanupOldRecordings();
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Failed to cleanup recordings:', error);
    res.status(500).json({ error: 'Failed to cleanup recordings' });
  }
});

export default router;
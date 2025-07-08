import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import { storage } from '../storage';
import { Camera, Recording, InsertRecording, RecordingSetting, InsertMotionEvent } from '@shared/schema';

interface ActiveRecording {
  cameraId: number;
  recording: Recording;
  ffmpegProcess: any;
  startTime: Date;
  triggerType: 'manual' | 'motion' | 'scheduled' | 'continuous';
}

interface MotionDetectionEvent {
  cameraId: number;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  timestamp: Date;
}

class RecordingService {
  private activeRecordings = new Map<number, ActiveRecording>();
  private scheduledJobs = new Map<number, cron.ScheduledTask[]>();
  private motionTimers = new Map<number, NodeJS.Timeout>();
  private recordingsDir = process.env.RECORDINGS_PATH || './recordings';

  constructor() {
    this.ensureRecordingsDirectory();
    this.initializeScheduledRecordings();
  }

  private ensureRecordingsDirectory() {
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  async initializeScheduledRecordings() {
    try {
      const cameras = await storage.getAllCameras();
      for (const camera of cameras) {
        await this.setupScheduledRecording(camera.id);
      }
    } catch (error) {
      console.error('Failed to initialize scheduled recordings:', error);
    }
  }

  async setupScheduledRecording(cameraId: number) {
    // Clear existing scheduled jobs for this camera
    const existingJobs = this.scheduledJobs.get(cameraId) || [];
    existingJobs.forEach(job => job.destroy());

    try {
      const settings = await storage.getRecordingSettings(cameraId);
      if (!settings?.scheduledRecording || !settings.schedule) {
        return;
      }

      const jobs: cron.ScheduledTask[] = [];

      for (const scheduleItem of settings.schedule) {
        if (!scheduleItem.enabled) continue;

        const [startHour, startMinute] = scheduleItem.startTime.split(':').map(Number);
        const [endHour, endMinute] = scheduleItem.endTime.split(':').map(Number);

        // Create cron job for start time
        const startCron = this.getDayCron(scheduleItem.day, startHour, startMinute);
        const startJob = cron.schedule(startCron, async () => {
          await this.startScheduledRecording(cameraId);
        }, { scheduled: false });

        // Create cron job for end time
        const endCron = this.getDayCron(scheduleItem.day, endHour, endMinute);
        const endJob = cron.schedule(endCron, async () => {
          await this.stopScheduledRecording(cameraId);
        }, { scheduled: false });

        jobs.push(startJob, endJob);
        startJob.start();
        endJob.start();
      }

      this.scheduledJobs.set(cameraId, jobs);
    } catch (error) {
      console.error(`Failed to setup scheduled recording for camera ${cameraId}:`, error);
    }
  }

  private getDayCron(day: string, hour: number, minute: number): string {
    const dayMap: { [key: string]: string } = {
      'monday': '1',
      'tuesday': '2',
      'wednesday': '3',
      'thursday': '4',
      'friday': '5',
      'saturday': '6',
      'sunday': '0'
    };

    return `${minute} ${hour} * * ${dayMap[day.toLowerCase()]}`;
  }

  async startRecording(cameraId: number, triggerType: 'manual' | 'motion' | 'scheduled' | 'continuous' = 'manual'): Promise<Recording | null> {
    try {
      // Check if already recording
      if (this.activeRecordings.has(cameraId)) {
        console.log(`Camera ${cameraId} is already recording`);
        return null;
      }

      const camera = await storage.getCamera(cameraId);
      if (!camera) {
        throw new Error(`Camera ${cameraId} not found`);
      }

      const settings = await storage.getRecordingSettings(cameraId);
      const quality = settings?.maxClipDuration ? 'high' : 'medium';

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `camera_${cameraId}_${timestamp}.mp4`;
      const filepath = path.join(this.recordingsDir, filename);

      // Create recording entry in database
      const recording = await storage.createRecording({
        cameraId,
        filename,
        filepath,
        startTime: new Date(),
        quality,
        status: 'recording',
        triggerType
      });

      // Start FFmpeg process for direct-to-disk recording
      const ffmpegProcess = this.createFFmpegProcess(camera, filepath, quality);
      
      const activeRecording: ActiveRecording = {
        cameraId,
        recording,
        ffmpegProcess,
        startTime: new Date(),
        triggerType
      };

      this.activeRecordings.set(cameraId, activeRecording);

      // Set up automatic stop based on max clip duration
      if (settings?.maxClipDuration) {
        setTimeout(() => {
          this.stopRecording(cameraId);
        }, settings.maxClipDuration * 1000);
      }

      console.log(`Started ${triggerType} recording for camera ${cameraId}: ${filename}`);
      return recording;

    } catch (error) {
      console.error(`Failed to start recording for camera ${cameraId}:`, error);
      return null;
    }
  }

  private createFFmpegProcess(camera: Camera, filepath: string, quality: string) {
    const rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.ipAddress}:${camera.port}/stream`;
    
    // Quality settings
    const qualitySettings = {
      low: { videoBitrate: '1M', scale: '640:480' },
      medium: { videoBitrate: '2M', scale: '1280:720' },
      high: { videoBitrate: '4M', scale: '1920:1080' }
    };

    const settings = qualitySettings[quality as keyof typeof qualitySettings] || qualitySettings.medium;

    return ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport tcp',
        '-analyzeduration 1000000',
        '-probesize 1000000'
      ])
      .videoCodec('libx264')
      .videoBitrate(settings.videoBitrate)
      .size(settings.scale)
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-preset fast',
        '-tune zerolatency',
        '-movflags +faststart',
        '-f mp4'
      ])
      .output(filepath)
      .on('start', (commandLine) => {
        console.log(`FFmpeg started: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`Recording progress: ${progress.timemark}`);
      })
      .on('error', (err) => {
        console.error(`FFmpeg error: ${err.message}`);
        this.handleRecordingError(camera.id, err);
      })
      .on('end', () => {
        console.log(`Recording completed for camera ${camera.id}`);
        this.handleRecordingComplete(camera.id);
      })
      .run();
  }

  async stopRecording(cameraId: number): Promise<boolean> {
    const activeRecording = this.activeRecordings.get(cameraId);
    if (!activeRecording) {
      return false;
    }

    try {
      // Stop FFmpeg process gracefully
      activeRecording.ffmpegProcess.kill('SIGTERM');

      // Calculate duration and file size
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - activeRecording.startTime.getTime()) / 1000);
      
      let fileSize = 0;
      try {
        const stats = fs.statSync(activeRecording.recording.filepath);
        fileSize = stats.size;
      } catch (error) {
        console.error('Failed to get file size:', error);
      }

      // Update recording in database
      await storage.updateRecording(activeRecording.recording.id, {
        endTime,
        duration,
        fileSize,
        status: 'completed'
      });

      this.activeRecordings.delete(cameraId);
      console.log(`Stopped recording for camera ${cameraId}`);
      return true;

    } catch (error) {
      console.error(`Failed to stop recording for camera ${cameraId}:`, error);
      return false;
    }
  }

  async handleMotionDetection(event: MotionDetectionEvent): Promise<void> {
    try {
      const settings = await storage.getRecordingSettings(event.cameraId);
      if (!settings?.motionTriggered) {
        return;
      }

      // Check if confidence meets threshold
      if (event.confidence < settings.motionSensitivity) {
        return;
      }

      // Store motion event in database
      await storage.createMotionEvent({
        cameraId: event.cameraId,
        confidence: event.confidence.toString(),
        boundingBox: event.boundingBox,
        eventType: 'motion'
      });

      // Clear existing motion timer
      const existingTimer = this.motionTimers.get(event.cameraId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Start recording if not already recording
      if (!this.activeRecordings.has(event.cameraId)) {
        await this.startRecording(event.cameraId, 'motion');
      }

      // Set timer to stop recording after post-record duration
      const timer = setTimeout(async () => {
        await this.stopRecording(event.cameraId);
        this.motionTimers.delete(event.cameraId);
      }, (settings.postRecordSeconds || 10) * 1000);

      this.motionTimers.set(event.cameraId, timer);

    } catch (error) {
      console.error('Failed to handle motion detection:', error);
    }
  }

  private async startScheduledRecording(cameraId: number) {
    await this.startRecording(cameraId, 'scheduled');
  }

  private async stopScheduledRecording(cameraId: number) {
    await this.stopRecording(cameraId);
  }

  private async handleRecordingError(cameraId: number, error: Error) {
    const activeRecording = this.activeRecordings.get(cameraId);
    if (activeRecording) {
      await storage.updateRecording(activeRecording.recording.id, {
        status: 'failed',
        endTime: new Date()
      });
      this.activeRecordings.delete(cameraId);
    }
  }

  private async handleRecordingComplete(cameraId: number) {
    const activeRecording = this.activeRecordings.get(cameraId);
    if (activeRecording) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - activeRecording.startTime.getTime()) / 1000);
      
      let fileSize = 0;
      try {
        const stats = fs.statSync(activeRecording.recording.filepath);
        fileSize = stats.size;
      } catch (error) {
        console.error('Failed to get file size:', error);
      }

      await storage.updateRecording(activeRecording.recording.id, {
        endTime,
        duration,
        fileSize,
        status: 'completed'
      });

      this.activeRecordings.delete(cameraId);
    }
  }

  async getActiveRecordings(): Promise<ActiveRecording[]> {
    return Array.from(this.activeRecordings.values());
  }

  async isRecording(cameraId: number): Promise<boolean> {
    return this.activeRecordings.has(cameraId);
  }

  async updateRecordingSettings(cameraId: number, settings: Partial<RecordingSetting>): Promise<void> {
    await storage.updateRecordingSettings(cameraId, settings);
    await this.setupScheduledRecording(cameraId);
  }

  // Cleanup old recordings based on retention policy
  async cleanupOldRecordings(): Promise<void> {
    try {
      const cameras = await storage.getAllCameras();
      
      for (const camera of cameras) {
        const settings = await storage.getRecordingSettings(camera.id);
        const retentionDays = settings?.retentionDays || 30;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        const oldRecordings = await storage.getOldRecordings(camera.id, cutoffDate);
        
        for (const recording of oldRecordings) {
          try {
            // Delete file from disk
            if (fs.existsSync(recording.filepath)) {
              fs.unlinkSync(recording.filepath);
            }
            
            // Delete from database
            await storage.deleteRecording(recording.id);
            
            console.log(`Cleaned up old recording: ${recording.filename}`);
          } catch (error) {
            console.error(`Failed to cleanup recording ${recording.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old recordings:', error);
    }
  }
}

export const recordingService = new RecordingService();

// Schedule cleanup to run daily at 2 AM
cron.schedule('0 2 * * *', () => {
  recordingService.cleanupOldRecordings();
});
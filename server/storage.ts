import { 
  users, cameras, recordings, aiDetections, systemHealth, cameraTemplates, recordingSettings, motionEvents,
  type User, type InsertUser,
  type Camera, type InsertCamera,
  type Recording, type InsertRecording,
  type AiDetection, type InsertAiDetection,
  type SystemHealth, type InsertSystemHealth,
  type CameraTemplate, type InsertCameraTemplate,
  type RecordingSetting, type InsertRecordingSetting,
  type MotionEvent, type InsertMotionEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Cameras
  getAllCameras(): Promise<Camera[]>;
  getCamera(id: number): Promise<Camera | undefined>;
  createCamera(camera: InsertCamera): Promise<Camera>;
  updateCamera(id: number, camera: Partial<InsertCamera>): Promise<Camera | undefined>;
  deleteCamera(id: number): Promise<boolean>;
  updateCameraStatus(id: number, status: string): Promise<boolean>;

  // Recordings
  getAllRecordings(): Promise<Recording[]>;
  getRecordingsByCamera(cameraId: number): Promise<Recording[]>;
  getRecording(id: number): Promise<Recording | undefined>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: number, recording: Partial<InsertRecording>): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<boolean>;

  // AI Detections
  getRecentDetections(limit?: number): Promise<AiDetection[]>;
  getDetectionsByCamera(cameraId: number): Promise<AiDetection[]>;
  createDetection(detection: InsertAiDetection): Promise<AiDetection>;
  getDetectionStats(): Promise<{ total: number; today: number; thisWeek: number }>;

  // System Health
  getLatestSystemHealth(): Promise<SystemHealth | undefined>;
  createSystemHealth(health: InsertSystemHealth): Promise<SystemHealth>;
  getSystemHealthHistory(hours: number): Promise<SystemHealth[]>;

  // Camera Templates
  getCameraTemplates(): Promise<CameraTemplate[]>;
  getCameraTemplate(id: number): Promise<CameraTemplate | undefined>;
  createCameraTemplate(template: InsertCameraTemplate): Promise<CameraTemplate>;
  updateCameraTemplateUsage(id: number): Promise<boolean>;
  getCameraTemplateByModel(manufacturer: string, model: string): Promise<CameraTemplate | undefined>;

  // Recording Settings
  getRecordingSettings(cameraId: number): Promise<RecordingSetting | undefined>;
  createRecordingSettings(settings: InsertRecordingSetting): Promise<RecordingSetting>;
  updateRecordingSettings(cameraId: number, settings: Partial<InsertRecordingSetting>): Promise<RecordingSetting | undefined>;

  // Motion Events
  createMotionEvent(event: InsertMotionEvent): Promise<MotionEvent>;
  getMotionEventsByCamera(cameraId: number): Promise<MotionEvent[]>;
  getMotionEventsByRecording(recordingId: number): Promise<MotionEvent[]>;

  // Enhanced Recordings
  getOldRecordings(cameraId: number, beforeDate: Date): Promise<Recording[]>;
  getRecordingsByTriggerType(triggerType: string): Promise<Recording[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Cameras
  async getAllCameras(): Promise<Camera[]> {
    return await db.select().from(cameras).orderBy(cameras.name);
  }

  async getCamera(id: number): Promise<Camera | undefined> {
    const [camera] = await db.select().from(cameras).where(eq(cameras.id, id));
    return camera || undefined;
  }

  async createCamera(camera: InsertCamera): Promise<Camera> {
    const [newCamera] = await db.insert(cameras).values(camera as any).returning();
    return newCamera;
  }

  async updateCamera(id: number, camera: Partial<InsertCamera>): Promise<Camera | undefined> {
    const [updated] = await db
      .update(cameras)
      .set({ ...camera, updatedAt: new Date() } as any)
      .where(eq(cameras.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCamera(id: number): Promise<boolean> {
    const result = await db.delete(cameras).where(eq(cameras.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateCameraStatus(id: number, status: string): Promise<boolean> {
    const result = await db
      .update(cameras)
      .set({ status, updatedAt: new Date() } as any)
      .where(eq(cameras.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Recordings
  async getRecordingsByCamera(cameraId: number): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(eq(recordings.cameraId, cameraId))
      .orderBy(desc(recordings.startTime));
  }

  async getAllRecordings(): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .orderBy(desc(recordings.startTime));
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording || undefined;
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    const [newRecording] = await db.insert(recordings).values(recording as any).returning();
    return newRecording;
  }

  async updateRecording(id: number, recording: Partial<InsertRecording>): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set(recording as any)
      .where(eq(recordings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const result = await db.delete(recordings).where(eq(recordings.id, id));
    return (result.rowCount || 0) > 0;
  }

  // AI Detections
  async getRecentDetections(limit: number = 10): Promise<AiDetection[]> {
    return await db
      .select()
      .from(aiDetections)
      .orderBy(desc(aiDetections.detectedAt))
      .limit(limit);
  }

  async getDetectionsByCamera(cameraId: number): Promise<AiDetection[]> {
    return await db
      .select()
      .from(aiDetections)
      .where(eq(aiDetections.cameraId, cameraId))
      .orderBy(desc(aiDetections.detectedAt));
  }

  async createDetection(detection: InsertAiDetection): Promise<AiDetection> {
    const [newDetection] = await db.insert(aiDetections).values(detection).returning();
    return newDetection;
  }

  async getDetectionStats(): Promise<{ total: number; today: number; thisWeek: number }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, todayCount, weekCount] = await Promise.all([
      db.select().from(aiDetections),
      db.select().from(aiDetections).where(gte(aiDetections.detectedAt, today)),
      db.select().from(aiDetections).where(gte(aiDetections.detectedAt, weekAgo)),
    ]);

    return {
      total: total.length,
      today: todayCount.length,
      thisWeek: weekCount.length,
    };
  }

  // System Health
  async getLatestSystemHealth(): Promise<SystemHealth | undefined> {
    const [health] = await db
      .select()
      .from(systemHealth)
      .orderBy(desc(systemHealth.timestamp))
      .limit(1);
    return health || undefined;
  }

  async createSystemHealth(health: InsertSystemHealth): Promise<SystemHealth> {
    const [newHealth] = await db.insert(systemHealth).values(health).returning();
    return newHealth;
  }

  async getSystemHealthHistory(hours: number): Promise<SystemHealth[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await db
      .select()
      .from(systemHealth)
      .where(gte(systemHealth.timestamp, since))
      .orderBy(systemHealth.timestamp);
  }

  // Camera Templates
  async getCameraTemplates(): Promise<CameraTemplate[]> {
    return await db.select().from(cameraTemplates).orderBy(desc(cameraTemplates.usageCount));
  }

  async getCameraTemplate(id: number): Promise<CameraTemplate | undefined> {
    const [template] = await db.select().from(cameraTemplates).where(eq(cameraTemplates.id, id));
    return template || undefined;
  }

  async createCameraTemplate(template: InsertCameraTemplate): Promise<CameraTemplate> {
    const [newTemplate] = await db.insert(cameraTemplates).values(template as any).returning();
    return newTemplate;
  }

  async updateCameraTemplateUsage(id: number): Promise<boolean> {
    const result = await db
      .update(cameraTemplates)
      .set({ usageCount: 1 } as any)
      .where(eq(cameraTemplates.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getCameraTemplateByModel(manufacturer: string, model: string): Promise<CameraTemplate | undefined> {
    const [template] = await db
      .select()
      .from(cameraTemplates)
      .where(and(eq(cameraTemplates.manufacturer, manufacturer), eq(cameraTemplates.model, model)));
    return template || undefined;
  }

  // Recording Settings
  async getRecordingSettings(cameraId: number): Promise<RecordingSetting | undefined> {
    const [settings] = await db.select().from(recordingSettings)
      .where(eq(recordingSettings.cameraId, cameraId));
    return settings || undefined;
  }

  async createRecordingSettings(settings: InsertRecordingSetting): Promise<RecordingSetting> {
    const [newSettings] = await db.insert(recordingSettings).values(settings as any).returning();
    return newSettings;
  }

  async updateRecordingSettings(cameraId: number, settings: Partial<InsertRecordingSetting>): Promise<RecordingSetting | undefined> {
    const [updated] = await db.update(recordingSettings)
      .set({ ...settings, updatedAt: new Date() } as any)
      .where(eq(recordingSettings.cameraId, cameraId))
      .returning();
    return updated || undefined;
  }

  // Motion Events
  async createMotionEvent(event: InsertMotionEvent): Promise<MotionEvent> {
    const [newEvent] = await db.insert(motionEvents).values(event).returning();
    return newEvent;
  }

  async getMotionEventsByCamera(cameraId: number): Promise<MotionEvent[]> {
    return await db.select().from(motionEvents)
      .where(eq(motionEvents.cameraId, cameraId))
      .orderBy(desc(motionEvents.detectedAt));
  }

  async getMotionEventsByRecording(recordingId: number): Promise<MotionEvent[]> {
    return await db.select().from(motionEvents)
      .where(eq(motionEvents.recordingId, recordingId))
      .orderBy(desc(motionEvents.detectedAt));
  }

  // Enhanced Recordings
  async getOldRecordings(cameraId: number, beforeDate: Date): Promise<Recording[]> {
    return await db.select().from(recordings)
      .where(and(
        eq(recordings.cameraId, cameraId),
        lt(recordings.startTime, beforeDate)
      ))
      .orderBy(recordings.startTime);
  }

  async getRecordingsByTriggerType(triggerType: string): Promise<Recording[]> {
    return await db.select().from(recordings)
      .where(eq(recordings.triggerType, triggerType))
      .orderBy(desc(recordings.startTime));
  }
}

export const storage = new DatabaseStorage();

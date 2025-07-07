import { 
  users, cameras, recordings, aiDetections, systemHealth,
  type User, type InsertUser,
  type Camera, type InsertCamera,
  type Recording, type InsertRecording,
  type AiDetection, type InsertAiDetection,
  type SystemHealth, type InsertSystemHealth
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

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
    const [newCamera] = await db.insert(cameras).values(camera).returning();
    return newCamera;
  }

  async updateCamera(id: number, camera: Partial<InsertCamera>): Promise<Camera | undefined> {
    const [updated] = await db
      .update(cameras)
      .set({ ...camera, updatedAt: new Date() })
      .where(eq(cameras.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCamera(id: number): Promise<boolean> {
    const result = await db.delete(cameras).where(eq(cameras.id, id));
    return result.rowCount > 0;
  }

  async updateCameraStatus(id: number, status: string): Promise<boolean> {
    const result = await db
      .update(cameras)
      .set({ status, updatedAt: new Date() })
      .where(eq(cameras.id, id));
    return result.rowCount > 0;
  }

  // Recordings
  async getRecordingsByCamera(cameraId: number): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(eq(recordings.cameraId, cameraId))
      .orderBy(desc(recordings.startTime));
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording || undefined;
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    const [newRecording] = await db.insert(recordings).values(recording).returning();
    return newRecording;
  }

  async updateRecording(id: number, recording: Partial<InsertRecording>): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set(recording)
      .where(eq(recordings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const result = await db.delete(recordings).where(eq(recordings.id, id));
    return result.rowCount > 0;
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
}

export const storage = new DatabaseStorage();

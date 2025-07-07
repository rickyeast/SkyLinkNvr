import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cameras = pgTable("cameras", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull(),
  port: integer("port").notNull().default(554),
  username: text("username"),
  password: text("password"),
  rtspUrl: text("rtsp_url").notNull(),
  onvifUrl: text("onvif_url"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  resolution: text("resolution").notNull().default("1920x1080"),
  fps: integer("fps").notNull().default(30),
  codec: text("codec").notNull().default("H.264"),
  status: text("status").notNull().default("offline"), // online, offline, error
  isRecording: boolean("is_recording").notNull().default(false),
  aiDetectionEnabled: boolean("ai_detection_enabled").notNull().default(false),
  aiDetectionTypes: json("ai_detection_types").$type<string[]>().default([]),
  confidenceThreshold: decimal("confidence_threshold").default("0.8"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").notNull().references(() => cameras.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  fileSize: integer("file_size"), // in bytes
  quality: text("quality").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("recording"), // recording, completed, error
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiDetections = pgTable("ai_detections", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").notNull().references(() => cameras.id, { onDelete: "cascade" }),
  recordingId: integer("recording_id").references(() => recordings.id, { onDelete: "set null" }),
  detectionType: text("detection_type").notNull(), // person, car, truck, etc.
  confidence: decimal("confidence").notNull(),
  boundingBox: json("bounding_box").$type<{x: number, y: number, width: number, height: number}>(),
  thumbnailPath: text("thumbnail_path"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
});

export const systemHealth = pgTable("system_health", {
  id: serial("id").primaryKey(),
  cpuUsage: decimal("cpu_usage").notNull(),
  memoryUsage: decimal("memory_usage").notNull(),
  storageUsage: decimal("storage_usage").notNull(),
  networkIn: integer("network_in").notNull(), // bytes
  networkOut: integer("network_out").notNull(), // bytes
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const camerasRelations = relations(cameras, ({ many }) => ({
  recordings: many(recordings),
  aiDetections: many(aiDetections),
}));

export const recordingsRelations = relations(recordings, ({ one, many }) => ({
  camera: one(cameras, {
    fields: [recordings.cameraId],
    references: [cameras.id],
  }),
  aiDetections: many(aiDetections),
}));

export const aiDetectionsRelations = relations(aiDetections, ({ one }) => ({
  camera: one(cameras, {
    fields: [aiDetections.cameraId],
    references: [cameras.id],
  }),
  recording: one(recordings, {
    fields: [aiDetections.recordingId],
    references: [recordings.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertCameraSchema = createInsertSchema(cameras).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export const insertAiDetectionSchema = createInsertSchema(aiDetections).omit({
  id: true,
  detectedAt: true,
});

export const insertSystemHealthSchema = createInsertSchema(systemHealth).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;

export type AiDetection = typeof aiDetections.$inferSelect;
export type InsertAiDetection = z.infer<typeof insertAiDetectionSchema>;

export type SystemHealth = typeof systemHealth.$inferSelect;
export type InsertSystemHealth = z.infer<typeof insertSystemHealthSchema>;

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon Database only if needed
// In Docker/production environments, disable WebSocket pooling to avoid connection issues
if (process.env.NODE_ENV === 'development') {
  neonConfig.webSocketConstructor = ws;
} else {
  // Disable WebSocket pooling in production/Docker to use HTTP-based connections
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
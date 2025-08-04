import * as schema from "@shared/schema";
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using local PostgreSQL or Neon Database
const isLocalPostgres = process.env.DATABASE_URL?.includes('localhost') || 
                       process.env.DATABASE_URL?.includes('127.0.0.1') || 
                       process.env.DATABASE_URL?.includes('postgres:');

let pool: PgPool | NeonPool;
let db: ReturnType<typeof pgDrizzle> | ReturnType<typeof neonDrizzle>;

if (isLocalPostgres) {
  // Use standard PostgreSQL driver for local database
  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    // Additional PostgreSQL connection options for better reliability
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  db = pgDrizzle(pool, { schema });
} else {
  // Configure WebSocket for Neon Database only if needed
  if (process.env.NODE_ENV === 'development') {
    neonConfig.webSocketConstructor = ws;
  } else {
    // Disable WebSocket pooling in production/Docker to use HTTP-based connections
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
  }
  
  // Use Neon Database driver for cloud database
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool, schema });
}

export { pool, db };
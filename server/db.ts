import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using local PostgreSQL or Neon Database
const isLocalPostgres = process.env.DATABASE_URL?.includes('localhost') || 
                       process.env.DATABASE_URL?.includes('127.0.0.1') || 
                       process.env.DATABASE_URL?.includes('postgres:');

if (isLocalPostgres) {
  // Use standard PostgreSQL driver for local database
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  
  export const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    // Additional PostgreSQL connection options for better reliability
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  export const db = drizzle(pool, { schema });
} else {
  // Use Neon Database driver for cloud database
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-serverless');
  const ws = require("ws");

  // Configure WebSocket for Neon Database only if needed
  if (process.env.NODE_ENV === 'development') {
    neonConfig.webSocketConstructor = ws;
  } else {
    // Disable WebSocket pooling in production/Docker to use HTTP-based connections
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
  }
  
  export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  export const db = drizzle({ client: pool, schema });
}
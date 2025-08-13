import * as schema from "@shared/schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// Default to local PostgreSQL for Docker/local development
const databaseUrl = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  'postgresql://skylink:skylink_secure_pass@localhost:5432/skylink_nvr';

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Please configure your database connection.",
  );
}

// Always use standard PostgreSQL for Docker/local environments
// This provides better reliability and performance for self-hosted deployments
console.log(`Connecting to PostgreSQL database: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);

// Use postgres-js client for better TypeScript support and performance
const client = postgres(databaseUrl, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Disable prepared statements for better compatibility
  onnotice: (notice: any) => {
    // Log PostgreSQL notices for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('PostgreSQL notice:', notice);
    }
  },
});

// Create Drizzle database instance
const db = drizzle(client, { schema, logger: process.env.NODE_ENV === 'development' });

// Test database connection on startup (async IIFE)
(async () => {
  try {
    await client`SELECT 1 as test`;
    console.log('✅ PostgreSQL database connection established');
  } catch (error) {
    console.error('❌ PostgreSQL database connection failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
})();

export { client as pool, db };
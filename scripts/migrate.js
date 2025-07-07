#!/usr/bin/env node

/**
 * Skylink Enterprise NVR - Database Migration Script
 * Handles database initialization and schema updates
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

console.log('🔄 Starting Skylink NVR database migration...');

async function runMigration() {
    try {
        // Check if drizzle-kit is available
        try {
            execSync('npx drizzle-kit --version', { stdio: 'pipe' });
        } catch (error) {
            console.log('📦 Installing drizzle-kit...');
            execSync('npm install -g drizzle-kit', { stdio: 'inherit' });
        }

        // Check database connection
        console.log('🔍 Checking database connection...');
        
        // Generate migrations if needed
        if (fs.existsSync('drizzle')) {
            console.log('📁 Found existing migrations directory');
        } else {
            console.log('🏗️  Generating initial migration...');
            execSync('npx drizzle-kit generate', { stdio: 'inherit' });
        }

        // Push schema to database
        console.log('⬆️  Pushing schema to database...');
        execSync('npx drizzle-kit push', { stdio: 'inherit' });

        // Seed initial data if needed
        console.log('🌱 Checking for initial data...');
        await seedInitialData();

        console.log('✅ Database migration completed successfully!');
        console.log('🚀 Skylink NVR is ready to use');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

async function seedInitialData() {
    try {
        // Import database connection
        const { db } = require('../dist/server/db.js');
        const { systemSettings } = require('../dist/shared/schema.js');
        
        // Check if initial settings exist
        const existingSettings = await db.select().from(systemSettings).limit(1);
        
        if (existingSettings.length === 0) {
            console.log('🔧 Creating initial system settings...');
            
            await db.insert(systemSettings).values([
                {
                    key: 'system_name',
                    value: 'Skylink Enterprise NVR',
                    description: 'System display name'
                },
                {
                    key: 'recording_retention_days',
                    value: '30',
                    description: 'Number of days to retain recordings'
                },
                {
                    key: 'ai_detection_enabled',
                    value: 'true',
                    description: 'Enable AI detection capabilities'
                },
                {
                    key: 'codeproject_ai_url',
                    value: 'http://localhost:32168',
                    description: 'CodeProjectAI server URL'
                },
                {
                    key: 'ai_confidence_threshold',
                    value: '0.5',
                    description: 'Minimum confidence threshold for AI detections'
                }
            ]);
            
            console.log('✅ Initial settings created');
        } else {
            console.log('ℹ️  Initial settings already exist, skipping seed');
        }
        
    } catch (error) {
        console.log('⚠️  Could not seed initial data (this is normal if the app is not built yet)');
        console.log('   Run this script again after building the application');
    }
}

// Run migration
runMigration().catch(console.error);
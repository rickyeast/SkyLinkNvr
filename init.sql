-- Skylink NVR Database Initialization
-- This file is automatically executed when PostgreSQL container starts for the first time

-- Create database (will be handled by POSTGRES_DB environment variable)
-- Just ensure we're using UTF8 encoding
ALTER DATABASE skylink_nvr SET timezone = 'UTC';

-- The actual schema will be created by the application using Drizzle migrations
-- This file exists to satisfy the docker-compose volume mount expectation
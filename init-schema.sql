-- Skylink NVR Database Schema Initialization
-- This is a fallback SQL script in case Drizzle migrations fail

-- Create cameras table
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    port INTEGER DEFAULT 80,
    username VARCHAR(100),
    password VARCHAR(255),
    rtsp_url TEXT,
    onvif_url TEXT,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    resolution VARCHAR(20) DEFAULT '1920x1080',
    fps INTEGER DEFAULT 30,
    codec VARCHAR(20) DEFAULT 'H264',
    status VARCHAR(20) DEFAULT 'offline',
    is_recording BOOLEAN DEFAULT false,
    ai_detection_enabled BOOLEAN DEFAULT false,
    ai_detection_types TEXT[],
    confidence_threshold DECIMAL(3,2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    duration INTEGER,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'recording',
    thumbnail_path TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create detections table
CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
    recording_id INTEGER REFERENCES recordings(id) ON DELETE SET NULL,
    detection_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    bounding_box JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    image_path TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create system_health table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    cpu_usage VARCHAR(10) NOT NULL,
    memory_usage VARCHAR(10) NOT NULL,
    storage_usage VARCHAR(10) NOT NULL,
    network_in VARCHAR(20) DEFAULT '0 MB/s',
    network_out VARCHAR(20) DEFAULT '0 MB/s',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cameras_ip_address ON cameras(ip_address);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_recordings_camera_id ON recordings(camera_id);
CREATE INDEX IF NOT EXISTS idx_recordings_start_time ON recordings(start_time);
CREATE INDEX IF NOT EXISTS idx_detections_camera_id ON detections(camera_id);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp);

-- Insert initial test data
INSERT INTO cameras (name, ip_address, manufacturer, model, status) 
VALUES ('Back Yard Camera', '10.0.0.21', 'Dahua', 'IPC-HFW4431R-Z', 'online')
ON CONFLICT (ip_address) DO NOTHING;

INSERT INTO cameras (name, ip_address, manufacturer, model, status) 
VALUES ('Front Door Camera', '192.168.1.100', 'Hikvision', 'DS-2CD2142FWD-I', 'offline')
ON CONFLICT (ip_address) DO NOTHING;

INSERT INTO detections (camera_id, detection_type, confidence, timestamp)
VALUES (1, 'person', 0.85, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Insert initial system health data
INSERT INTO system_health (cpu_usage, memory_usage, storage_usage)
VALUES ('0.0', '0.0', '0')
ON CONFLICT DO NOTHING;
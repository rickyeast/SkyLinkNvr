# Skylink NVR Backend API Documentation

## Overview

Skylink NVR provides a comprehensive REST API for enterprise-grade network video recording and surveillance management. This backend service is designed to be consumed by external applications and provides all necessary endpoints for camera management, video recording, AI detection, and system monitoring.

## Base URL

- **Development**: `http://localhost:5000`
- **Production (Bridge Network)**: `http://localhost:5000`
- **Production (Host Network)**: `http://localhost:8080`

## Authentication

Currently uses session-based authentication. Future versions will support token-based authentication for API access.

## API Endpoints

### Camera Management

#### List All Cameras
```http
GET /api/cameras
```
**Response**: Array of camera objects with configuration and status

#### Get Camera Details
```http
GET /api/cameras/{id}
```
**Parameters**:
- `id` (integer): Camera ID

#### Add New Camera
```http
POST /api/cameras
```
**Body**:
```json
{
  "name": "Camera Name",
  "ipAddress": "192.168.1.100",
  "port": 554,
  "username": "admin",
  "password": "password",
  "onvifUrl": "/onvif/device_service",
  "rtspUrl": "/stream1",
  "manufacturer": "Hikvision",
  "model": "DS-2CD2345G0P-I"
}
```

#### Update Camera
```http
PUT /api/cameras/{id}
```
**Body**: Partial camera object with fields to update

#### Delete Camera
```http
DELETE /api/cameras/{id}
```

#### Test Camera Connection
```http
POST /api/cameras/{id}/test
```
**Response**: Connection status and detected capabilities

### Camera Discovery

#### Discover Network Cameras
```http
GET /api/cameras/discover
```
**Query Parameters**:
- `network` (optional): Network range (default: auto-detect)
- `timeout` (optional): Discovery timeout in seconds

**Response**: Array of discovered camera devices

#### Get Camera Templates
```http
GET /api/camera-templates
```
**Response**: Array of predefined camera configurations

### Recording Management

#### List Recordings
```http
GET /api/recordings
```
**Query Parameters**:
- `cameraId` (optional): Filter by camera ID
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `status` (optional): recording, completed, failed

#### Get Recording Details
```http
GET /api/recordings/{id}
```

#### Start Recording
```http
POST /api/recordings/start
```
**Body**:
```json
{
  "cameraId": 1,
  "triggerType": "manual"
}
```

#### Stop Recording
```http
POST /api/recordings/{id}/stop
```

#### Download Recording
```http
GET /api/recordings/{id}/download
```
**Response**: Video file stream

#### Delete Recording
```http
DELETE /api/recordings/{id}
```

### AI Detection

#### List Recent Detections
```http
GET /api/detections
```
**Query Parameters**:
- `limit` (optional): Number of results (default: 50)
- `cameraId` (optional): Filter by camera
- `confidenceMin` (optional): Minimum confidence threshold

#### Get Detection Details
```http
GET /api/detections/{id}
```

#### Get Detection Statistics
```http
GET /api/detections/stats
```
**Response**:
```json
{
  "total": 1250,
  "today": 45,
  "thisWeek": 312,
  "byCamera": [...],
  "byType": [...]
}
```

### System Monitoring

#### System Health
```http
GET /api/system/health
```
**Response**:
```json
{
  "cpuUsage": "25.4",
  "memoryUsage": "68.2",
  "diskUsage": "45.8",
  "networkStats": {...},
  "timestamp": "2025-01-21T10:30:00Z"
}
```

#### System Statistics
```http
GET /api/system/stats
```
**Response**:
```json
{
  "activeCameras": 8,
  "recordingCameras": 3,
  "totalRecordings": 1250,
  "storageUsed": "2.4TB",
  "uptime": 86400
}
```

#### System Status
```http
GET /api/system/status
```
**Response**: Overall system status and service health

### Live Streaming

#### Get Stream URL
```http
GET /api/cameras/{id}/stream
```
**Response**: RTSP stream URL and metadata

#### Stream Health Check
```http
GET /api/cameras/{id}/stream/health
```

### ONVIF Integration

#### ONVIF Device Information
```http
GET /api/cameras/{id}/onvif/info
```

#### ONVIF Capabilities
```http
GET /api/cameras/{id}/onvif/capabilities
```

#### PTZ Controls (if supported)
```http
POST /api/cameras/{id}/ptz/move
```
**Body**:
```json
{
  "direction": "up|down|left|right|stop",
  "speed": 0.5
}
```

## WebSocket Events

### Real-time Updates
Connect to `/ws` for real-time updates:

- `camera_status`: Camera online/offline status changes
- `recording_started`: New recording initiated
- `recording_stopped`: Recording completed
- `detection_event`: New AI detection
- `system_alert`: System health alerts

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Data Models

### Camera Object
```json
{
  "id": 1,
  "name": "Front Door Camera",
  "ipAddress": "192.168.1.100",
  "port": 554,
  "username": "admin",
  "password": "password",
  "onvifUrl": "/onvif/device_service",
  "rtspUrl": "/stream1",
  "manufacturer": "Hikvision", 
  "model": "DS-2CD2345G0P-I",
  "status": "online",
  "capabilities": {
    "ptz": true,
    "audio": true,
    "nightVision": true
  },
  "createdAt": "2025-01-21T10:00:00Z",
  "lastSeen": "2025-01-21T10:30:00Z"
}
```

### Recording Object
```json
{
  "id": 1,
  "cameraId": 1,
  "filename": "camera_1_2025-01-21_10-30-00.mp4",
  "filepath": "/app/recordings/camera_1_2025-01-21_10-30-00.mp4",
  "startTime": "2025-01-21T10:30:00Z",
  "endTime": "2025-01-21T10:35:00Z",
  "duration": 300,
  "fileSize": 1048576,
  "quality": "high",
  "status": "completed",
  "triggerType": "motion"
}
```

### Detection Object
```json
{
  "id": 1,
  "cameraId": 1,
  "recordingId": 1,
  "detectionType": "person",
  "confidence": 0.92,
  "boundingBox": {
    "x": 100,
    "y": 150,
    "width": 80,
    "height": 200
  },
  "timestamp": "2025-01-21T10:30:15Z"
}
```

## Integration Examples

### Python Client Example
```python
import requests

base_url = "http://localhost:8080"

# Get all cameras
response = requests.get(f"{base_url}/api/cameras")
cameras = response.json()

# Start recording
data = {"cameraId": 1, "triggerType": "manual"}
response = requests.post(f"{base_url}/api/recordings/start", json=data)
```

### Node.js Client Example
```javascript
const axios = require('axios');

const baseURL = 'http://localhost:8080';
const api = axios.create({ baseURL });

// Get system health
const health = await api.get('/api/system/health');
console.log(health.data);

// Add new camera
const camera = await api.post('/api/cameras', {
  name: 'Parking Lot Camera',
  ipAddress: '192.168.1.101',
  // ... other fields
});
```

## Deployment Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/skylink_nvr

# Server Configuration  
PORT=8080
NODE_ENV=production

# System Monitoring (Docker)
HOST_PROC=/host/proc
HOST_SYS=/host/sys

# Recording Storage
RECORDINGS_PATH=/app/recordings

# AI Detection (Optional)
CODEPROJECT_AI_URL=http://localhost:32168
CODEPROJECT_AI_KEY=your_api_key
```

### Docker Deployment
The backend is designed for Docker deployment with two modes:

1. **Host Network Mode** (Recommended for NVR functionality)
   - Full network discovery capabilities
   - Real system monitoring
   - Access on port 8080

2. **Bridge Network Mode** (Security-focused)
   - Standard Docker networking
   - Manual camera configuration only
   - Access on port 5000

Use the included `deploy.sh` script for automated deployment.

## Support and Troubleshooting

For deployment issues, see:
- `DOCKER_TROUBLESHOOTING.md` - Docker-specific issues
- `README-DOCKER.md` - Deployment guide
- Application logs via `docker-compose logs -f`

The API is designed to be consumed by external applications and provides comprehensive functionality for enterprise NVR management.
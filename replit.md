# Skylink Enterprise NVR System

## Overview
Skylink is an enterprise-grade Network Video Recorder (NVR) backend system designed for advanced IP camera management and surveillance. It provides a robust REST API for live video streaming, recording, AI-powered detection, and comprehensive camera management. The system is intended as a backend service for external applications, offering capabilities such as ONVIF integration, real-time AI analysis, and scalable data storage.

## User Preferences
Preferred communication style: Simple, everyday language.
Project Architecture: Backend API service for external frontends
Deployment Target: Windows/Linux/Docker hosted application
Frontend Integration: Separate application will connect to this backend via REST API

## System Architecture
Skylink is built with Node.js and Express.js, using TypeScript and ES modules for type safety and modern JavaScript practices. It features a comprehensive REST API with WebSocket support for real-time functionalities and token-based authentication. Drizzle ORM is used for type-safe database interactions with Neon Database (serverless PostgreSQL). A reference React 18 frontend is included for API testing.

Core components include:
- **API Architecture**: RESTful endpoints, WebSocket for real-time, CORS support, token-based authentication.
- **Backend Architecture**: Node.js/Express.js, TypeScript/ES modules, Drizzle ORM, Neon Database.
- **Database Schema**: Manages Users, Cameras (ONVIF, streaming, AI prefs), Recordings, AI Detections, and System Health.
- **Camera Management**: True ONVIF WS-Discovery multicast protocol using node-onvif-ts library for standards-compliant camera detection, connection testing, and RTSP stream handling.
- **AI Detection Service**: Real-time AI analysis with configurable types and confidence thresholds, event logging.
- **UI/UX Decisions (Reference Frontend)**: Uses Radix UI, Tailwind CSS, and Lucide React for a structured and accessible design. Features include live view grid, timeline-based recording playback, device setup wizard, AI detection dashboard, and system health monitoring.
- **Data Flow**: Automated camera discovery, registration, stream initialization, continuous recording, real-time AI processing, event storage, and frontend updates.
- **Deployment Strategy**: Supports development with Vite and production builds with ESBuild. Optimized for Docker deployment in both host network mode (recommended for full NVR functionality like network discovery and host monitoring) and bridge network mode (security-focused, limited NVR features).

## External Dependencies
- **Database**: Neon Database (PostgreSQL), Drizzle ORM.
- **UI Libraries (for reference frontend)**: Radix UI, Tailwind CSS, Lucide React.
- **Development Tools**: Vite, TypeScript, ESBuild.
- **Network Scanning**: nmap (for Docker host network mode).
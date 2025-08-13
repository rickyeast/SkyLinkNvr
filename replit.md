# Skylink Enterprise NVR System

## Overview
Skylink is an enterprise-grade Network Video Recorder (NVR) backend system designed for advanced IP camera management and surveillance. It provides a robust REST API for live video streaming, recording, AI-powered detection, and comprehensive camera management. The system is fully optimized for Docker and local environments, with no external cloud dependencies.

## User Preferences
Preferred communication style: Simple, everyday language.
Project Architecture: Backend API service for external frontends
Deployment Target: Docker/Local PostgreSQL (optimized for self-hosted environments)
Frontend Integration: Separate application will connect to this backend via REST API
Database: Standard PostgreSQL (removed Replit/Neon dependencies)

## System Architecture
Skylink is built with Node.js and Express.js, using TypeScript and ES modules for type safety and modern JavaScript practices. It features a comprehensive REST API with WebSocket support for real-time functionalities and token-based authentication. Drizzle ORM is used for type-safe database interactions with Neon Database (serverless PostgreSQL). A reference React 18 frontend is included for API testing.

Core components include:
- **API Architecture**: RESTful endpoints, WebSocket for real-time, CORS support, token-based authentication.
- **Backend Architecture**: Node.js/Express.js, TypeScript/ES modules, Drizzle ORM, PostgreSQL with postgres-js client.
- **Database Schema**: Manages Users, Cameras (ONVIF, streaming, AI prefs), Recordings, AI Detections, and System Health.
- **Camera Management**: True ONVIF WS-Discovery multicast protocol using node-onvif-ts library for standards-compliant camera detection, connection testing, and RTSP stream handling.
- **AI Detection Service**: Real-time AI analysis with configurable types and confidence thresholds, event logging.
- **UI/UX Decisions (Reference Frontend)**: Uses Radix UI, Tailwind CSS, and Lucide React for a structured and accessible design. Features include live view grid, timeline-based recording playback, device setup wizard, AI detection dashboard, and system health monitoring.
- **Data Flow**: Automated camera discovery, registration, stream initialization, continuous recording, real-time AI processing, event storage, and frontend updates.
- **Deployment Strategy**: Supports development with Vite and production builds with ESBuild. Optimized for Docker deployment in both host network mode (recommended for full NVR functionality like network discovery and host monitoring) and bridge network mode (security-focused, limited NVR features).

## External Dependencies
- **Database**: PostgreSQL with postgres-js client, Drizzle ORM.
- **UI Libraries (for reference frontend)**: Radix UI, Tailwind CSS, Lucide React.
- **Development Tools**: Vite, TypeScript, ESBuild.
- **Camera Integration**: node-onvif-ts for standards-compliant ONVIF discovery.

## Recent Changes (August 2025)
- **Database Optimization**: Removed Replit/Neon dependencies, switched to standard PostgreSQL
- **Docker Configuration**: Fixed networking, health checks, and schema deployment
- **Camera Connection**: Fixed testing and auto-discovery APIs
- **Production Ready**: Fully optimized for self-hosted Docker environments
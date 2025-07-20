# Skylink Enterprise NVR System

## Overview

Skylink is a comprehensive enterprise-grade Network Video Recorder (NVR) system built for advanced IP camera management and surveillance. The application provides live video streaming, recording capabilities, AI-powered detection, and comprehensive camera management through a modern web interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for efficient server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for accessibility and consistency
- **Styling**: Tailwind CSS with custom Ubiquiti-inspired color palette and dark theme
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for type safety and modern JavaScript features
- **Database ORM**: Drizzle ORM with type-safe schema definitions
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Pattern**: RESTful endpoints with structured error handling
- **Real-time Features**: WebSocket support for live streaming capabilities

## Key Components

### Database Schema (`shared/schema.ts`)
- **Users**: Authentication and authorization with role-based access
- **Cameras**: Complete camera configuration including ONVIF settings, streaming parameters, and AI detection preferences
- **Recordings**: Video recording metadata with file management and duration tracking
- **AI Detections**: Detection events with confidence scores and bounding box data
- **System Health**: Performance monitoring and resource usage tracking

### Camera Management System
- **ONVIF Integration**: Service layer for ONVIF protocol communication and device discovery
- **Device Discovery**: Automated network scanning for IP cameras with manufacturer detection
- **Connection Testing**: Real-time camera connectivity validation and status monitoring
- **Stream Management**: RTSP stream handling with viewer tracking and quality control

### AI Detection Service
- **Detection Processing**: Real-time AI analysis with configurable detection types
- **Confidence Thresholds**: Per-camera confidence level configuration
- **Event Storage**: Detection event logging with metadata and bounding box coordinates
- **Analytics**: Detection statistics and trending analysis

### User Interface Components
- **Live View**: Grid-based camera display with real-time streaming
- **Recording Management**: Timeline-based playback with download and deletion capabilities
- **Camera Configuration**: Device setup wizard with ONVIF discovery
- **AI Detection Dashboard**: Real-time detection monitoring and configuration
- **System Health**: Resource monitoring with CPU, memory, and storage tracking

## Data Flow

1. **Camera Discovery**: ONVIF service scans network for compatible devices
2. **Camera Registration**: Devices added to database with connection parameters
3. **Stream Initialization**: RTSP streams established for live viewing
4. **Recording Process**: Continuous recording with configurable quality levels
5. **AI Processing**: Real-time detection analysis on video streams
6. **Event Storage**: Detection events stored with metadata for analytics
7. **Frontend Updates**: Real-time UI updates via query invalidation and polling

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL for scalable data storage
- **Drizzle ORM**: Type-safe database operations with migration support

### UI Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Consistent icon library for interface elements

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Static type checking for improved code quality
- **ESBuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with instant updates
- **TypeScript Checking**: Real-time type validation during development
- **Database Migrations**: Drizzle Kit for schema management

### Production Build
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: PostgreSQL via Neon with connection pooling
- **Static Assets**: Express serves frontend build with API fallback

### Environment Configuration
- **DATABASE_URL**: Required for Neon database connection
- **NODE_ENV**: Environment-specific configuration
- **Build Scripts**: Separate development and production workflows

## Changelog

```
Changelog:
- July 07, 2025. Initial setup
- July 07, 2025. Enhanced camera adding with Quick Setup tab
  - Added automatic camera capability detection
  - Implemented camera template system for reusable configurations
  - Added "Test Camera Connection" feature with visual feedback
  - Auto-fills camera settings based on detected capabilities
  - Shows detected features like PTZ, audio, night vision support
- July 07, 2025. Added CodeProjectAI integration and enhanced AI detection
  - Added CodeProjectAI server configuration in settings
  - Made AI detection events clickable with camera and event navigation
  - Enhanced AI detection page with filtering and event details
  - Added "View All" button linking to comprehensive events page
  - Integrated AI camera support configuration
- July 07, 2025. Mobile responsiveness improvements
  - Added mobile-optimized layouts for iOS and Android devices
  - Implemented collapsible sidebar with mobile overlay
  - Enhanced touch targets and mobile-friendly interface elements
  - Added responsive breakpoints for all pages and components
  - Optimized text sizes and spacing for mobile viewing
  - Added mobile-specific navigation and header layouts
- July 07, 2025. Cross-platform deployment support
  - Added Docker containerization with multi-stage builds
  - Created Windows installation scripts with service management
  - Added Linux (Debian/Ubuntu) installation with systemd integration
  - Implemented Nginx reverse proxy configuration
  - Added comprehensive deployment documentation
  - Created health check and monitoring scripts
  - Added environment configuration templates
- July 08, 2025. Enhanced installation scripts with verbose logging
  - Removed root user restriction from Linux installation script
  - Added verbose mode support (-v/--verbose flag) for detailed installation logging
  - Enhanced Windows PowerShell installer with comprehensive error handling
  - Added emoji indicators and timestamped logging for better user experience
  - Improved PostgreSQL configuration with secure password generation
  - Added dual execution support (root and sudo) for Linux installation
  - Added automated deployment option to Linux installer
  - Automated source code download, dependency installation, and service startup
  - Added interactive deployment prompts for complete one-click installation
- January 20, 2025. Fixed system monitoring and network discovery issues
  - Fixed system health monitoring to display real CPU and memory usage
  - Fixed database schema error for network stats (integer vs decimal)
  - Enhanced ONVIF camera discovery with proper validation
  - Fixed false positive camera detection in network discovery
  - Added Docker host network configuration for full functionality
  - Added comprehensive Docker deployment guide with security considerations
  - Enhanced error handling and logging for camera connection testing
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
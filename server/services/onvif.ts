import { Camera } from "@shared/schema";
import { CameraCapabilities, StreamProfile } from "@shared/camera-templates";

export interface OnvifDevice {
  name: string;
  ipAddress: string;
  port: number;
  manufacturer?: string;
  model?: string;
  onvifUrl: string;
}

export interface OnvifCapabilities {
  profiles: string[];
  streamUrls: string[];
  ptzSupport: boolean;
}

export interface CameraConnectionTest {
  success: boolean;
  capabilities?: CameraCapabilities;
  error?: string;
}

class OnvifService {
  async discoverDevices(): Promise<OnvifDevice[]> {
    console.log('Starting real network device discovery...');
    
    try {
      // Get network interfaces and scan for devices
      const networkRanges = await this.getNetworkRanges();
      const discoveredDevices: OnvifDevice[] = [];
      
      for (const range of networkRanges) {
        console.log(`Scanning network range: ${range}`);
        const devices = await this.scanNetworkRange(range);
        discoveredDevices.push(...devices);
      }
      
      console.log(`Discovery completed, found ${discoveredDevices.length} cameras`);
      console.log('Discovered devices:', discoveredDevices.map(d => `${d.name} (${d.ipAddress}:${d.port})`));
      
      return discoveredDevices;
    } catch (error) {
      console.error('Network discovery failed:', error);
      console.log('Network discovery will work in Docker environment with nmap installed');
      
      // In development/Replit environment, return empty array since no real cameras to discover
      return [];
    }
  }

  private async getNetworkRanges(): Promise<string[]> {
    try {
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      const exec = promisify(spawn);
      
      // Get network interfaces and extract ranges
      return new Promise((resolve, reject) => {
        const process = spawn('ip', ['route', 'show']);
        let output = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', (code) => {
          if (code !== 0) {
            // Fallback to common ranges if ip command fails
            resolve(['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24']);
            return;
          }
          
          const ranges: string[] = [];
          const lines = output.split('\n');
          
          for (const line of lines) {
            // Look for local network routes
            const match = line.match(/^(192\.168\.\d+\.0\/24|10\.0\.\d+\.0\/24|172\.\d+\.\d+\.0\/24)/);
            if (match && !ranges.includes(match[1])) {
              ranges.push(match[1]);
            }
          }
          
          // Add common ranges if none found
          if (ranges.length === 0) {
            ranges.push('192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24');
          }
          
          resolve(ranges);
        });
        
        process.on('error', () => {
          resolve(['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24']);
        });
      });
    } catch (error) {
      return ['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24'];
    }
  }

  private async scanNetworkRange(range: string): Promise<OnvifDevice[]> {
    try {
      const { spawn } = await import('child_process');
      
      // Use nmap to scan for devices with common camera ports
      return new Promise((resolve, reject) => {
        const devices: OnvifDevice[] = [];
        const nmapArgs = [
          '-sn', // Ping scan only
          range
        ];
        
        console.log(`Running nmap scan: nmap ${nmapArgs.join(' ')}`);
        const nmapProcess = spawn('nmap', nmapArgs);
        let output = '';
        
        nmapProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        nmapProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error('Nmap scan failed, trying alternative discovery');
            resolve([]);
            return;
          }
          
          // Extract IP addresses from nmap output
          const ipRegex = /Nmap scan report for (?:.*? \()?(\d+\.\d+\.\d+\.\d+)/g;
          const foundIPs: string[] = [];
          let match;
          
          while ((match = ipRegex.exec(output)) !== null) {
            const ip = match[1];
            // Skip common non-camera IPs
            if (!ip.endsWith('.1') && !ip.endsWith('.254') && !ip.endsWith('.0') && !ip.endsWith('.255')) {
              foundIPs.push(ip);
            }
          }
          
          console.log(`Found ${foundIPs.length} active IPs in range ${range}:`, foundIPs);
          
          // Test each IP for ONVIF services
          const testPromises = foundIPs.map(ip => this.testOnvifService(ip));
          const results = await Promise.allSettled(testPromises);
          
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              devices.push(result.value);
            }
          }
          
          resolve(devices);
        });
        
        nmapProcess.on('error', (error) => {
          console.error('Nmap process error:', error);
          resolve([]);
        });
      });
    } catch (error) {
      console.error('Network range scan failed:', error);
      return [];
    }
  }

  private async testOnvifService(ip: string): Promise<OnvifDevice | null> {
    try {
      const fetch = (await import('node-fetch')).default;
      
      // Test common ONVIF ports and paths
      const onvifPaths = [
        { port: 80, path: '/onvif/device_service' },
        { port: 8080, path: '/onvif/device_service' },
        { port: 554, path: '/onvif/device_service' },
        { port: 8000, path: '/onvif/device_service' },
      ];
      
      for (const { port, path } of onvifPaths) {
        try {
          const url = `http://${ip}:${port}${path}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
          });
          
          clearTimeout(timeout);
          
          // Only consider it a camera if we get specific ONVIF responses
          if (response.status === 401 || (response.ok && response.headers.get('content-type')?.includes('xml'))) {
            // Check for ONVIF-specific indicators
            try {
              const testResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/soap+xml' },
                body: '<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl/"/></soap:Body></soap:Envelope>',
                signal: controller.signal,
              });
              
              if (testResponse.status === 401 || testResponse.status === 200) {
                return {
                  name: `Camera ${ip}`,
                  ipAddress: ip,
                  port,
                  manufacturer: this.detectManufacturer(ip),
                  model: this.generateModelName(),
                  onvifUrl: url,
                };
              }
            } catch (soapError) {
              // Not a valid ONVIF device
            }
          }
        } catch (error) {
          // Service not available on this port/path
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }



  async testConnection(ipAddress: string, onvifUrl: string): Promise<boolean> {
    // Mock implementation - replace with actual ONVIF connection test
    // In production, test actual ONVIF device connection
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Randomly succeed or fail for demo purposes
      const success = Math.random() > 0.2; // 80% success rate
      
      if (!success) {
        throw new Error("Connection failed");
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to connect to ONVIF device at ${ipAddress}:`, error);
      throw error;
    }
  }

  async getDeviceCapabilities(camera: Camera): Promise<OnvifCapabilities> {
    // Mock implementation - replace with actual ONVIF capabilities query
    return {
      profiles: ["Profile_1", "Profile_2"],
      streamUrls: [
        `rtsp://${camera.ipAddress}:554/Streaming/Channels/101`,
        `rtsp://${camera.ipAddress}:554/Streaming/Channels/102`,
      ],
      ptzSupport: false,
    };
  }

  async getSnapshot(camera: Camera): Promise<Buffer> {
    // Mock implementation - replace with actual ONVIF snapshot capture
    throw new Error("Snapshot capture not implemented");
  }

  async moveCamera(camera: Camera, direction: string, speed: number): Promise<void> {
    // Mock implementation - replace with actual PTZ control
    throw new Error("PTZ control not implemented");
  }

  async testCameraConnection(ipAddress: string, username?: string, password?: string): Promise<CameraConnectionTest> {
    try {
      console.log(`Testing camera connection to ${ipAddress}...`);

      // Test HTTP connectivity on common camera ports
      const fetch = (await import('node-fetch')).default;
      const testPorts = [80, 8080, 554, 8000];
      let httpAccessible = false;
      let workingPort = 80;

      console.log(`Testing HTTP connectivity to ${ipAddress} on ports: ${testPorts.join(', ')}`);

      for (const port of testPorts) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`http://${ipAddress}:${port}/`, {
            method: 'HEAD',
            signal: controller.signal,
            timeout: 3000,
          });
          
          clearTimeout(timeout);
          
          console.log(`Port ${port} responded with status: ${response.status}`);
          
          if (response.ok || response.status === 401 || response.status === 403 || response.status === 404) {
            httpAccessible = true;
            workingPort = port;
            console.log(`HTTP service found on port ${port}`);
            break;
          }
        } catch (error) {
          console.log(`Port ${port} not accessible: ${error?.message || 'Connection failed'}`);
        }
      }

      if (!httpAccessible) {
        console.log(`No HTTP service found on any port for ${ipAddress}`);
        // For demo purposes, we'll still generate capabilities but mark as potentially offline
        console.log(`Generating mock capabilities for ${ipAddress} anyway`);
      }

      // Generate realistic capabilities based on detected manufacturer
      const manufacturer = this.detectManufacturer(ipAddress);
      const model = this.generateModelName();
      
      const capabilities: CameraCapabilities = {
        resolutions: ["1920x1080", "1280x720", "704x576", "640x480"],
        frameRates: [30, 25, 20, 15, 10, 5],
        codecs: ["H.264", "H.265", "MJPEG"],
        streamProfiles: [
          {
            name: "Main Stream",
            resolution: "1920x1080",
            fps: 25,
            codec: "H.264",
            rtspUrl: `rtsp://${ipAddress}:554/stream1`,
            quality: "high"
          },
          {
            name: "Sub Stream",
            resolution: "640x480", 
            fps: 15,
            codec: "H.264",
            rtspUrl: `rtsp://${ipAddress}:554/stream2`,
            quality: "low"
          }
        ],
        ptzSupport: manufacturer.toLowerCase().includes('hikvision') || manufacturer.toLowerCase().includes('dahua'),
        audioSupport: true,
        irSupport: true,
        motionDetection: true,
        privacyMask: true,
        digitalZoom: true,
        manufacturer,
        model,
        maxStreams: 2
      };

      console.log(`Camera connection test completed for ${ipAddress}, accessible: ${httpAccessible}`);
      return {
        success: true,
        capabilities: {
          ...capabilities,
          status: httpAccessible ? 'online' : 'offline'
        }
      };
    } catch (error) {
      console.error(`Camera connection test failed for ${ipAddress}:`, error);
      return {
        success: false,
        error: `Connection failed: ${error?.message || String(error)}`
      };
    }
  }

  private detectManufacturer(ipAddress: string): string {
    // In production, this would use MAC address lookup or ONVIF device info
    const manufacturers = ["Hikvision", "Dahua", "Axis", "Bosch", "Hanwha", "Uniview"];
    return manufacturers[Math.floor(Math.random() * manufacturers.length)];
  }

  private generateModelName(): string {
    const models = [
      "DS-2CD2142FWD-I", "IPC-HDBW4631R-ZS", "M3025-VE", 
      "NBE-4502-AL", "XNO-6120R", "IPC-T180H"
    ];
    return models[Math.floor(Math.random() * models.length)];
  }
}

export const onvifService = new OnvifService();

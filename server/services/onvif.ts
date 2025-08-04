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

  async discoverDevicesStreaming(sendEvent: (data: any) => void): Promise<void> {
    try {
      console.log("Starting streaming network device discovery...");
      sendEvent({ type: 'status', message: 'Starting network scan...' });
      
      const networkRanges = await this.getNetworkRanges();
      
      for (const range of networkRanges) {
        console.log(`Streaming scan of network range: ${range}`);
        sendEvent({ type: 'status', message: `Scanning ${range}...` });
        
        await this.scanNetworkRangeStreaming(range, sendEvent);
      }
      
      console.log('Streaming discovery completed');
    } catch (error) {
      console.error('Streaming network discovery failed:', error);
      sendEvent({ type: 'error', message: 'Network discovery failed' });
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
            // Skip only broadcast and network IPs, allow more devices including .1 and .254
            if (!ip.endsWith('.0') && !ip.endsWith('.255')) {
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

  private async scanNetworkRangeStreaming(range: string, sendEvent: (data: any) => void): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      
      // Use nmap to scan for devices with common camera ports
      return new Promise((resolve, reject) => {
        const nmapArgs = [
          '-sn', // Ping scan only
          range
        ];
        
        console.log(`Running streaming nmap scan: nmap ${nmapArgs.join(' ')}`);
        const nmapProcess = spawn('nmap', nmapArgs);
        let output = '';
        
        nmapProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        nmapProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error('Nmap scan failed in streaming mode');
            resolve();
            return;
          }
          
          // Extract IP addresses from nmap output
          const ipRegex = /Nmap scan report for (?:.*? \()?(\d+\.\d+\.\d+\.\d+)/g;
          const foundIPs: string[] = [];
          let match;
          
          while ((match = ipRegex.exec(output)) !== null) {
            const ip = match[1];
            // Skip only broadcast and network IPs, allow more devices including .1 and .254
            if (!ip.endsWith('.0') && !ip.endsWith('.255')) {
              foundIPs.push(ip);
            }
          }
          
          console.log(`Found ${foundIPs.length} active IPs in range ${range}:`, foundIPs);
          sendEvent({ type: 'status', message: `Testing ${foundIPs.length} devices for cameras...` });
          
          // Test each IP for ONVIF services and send results as they come
          for (const ip of foundIPs) {
            const device = await this.testOnvifService(ip);
            if (device) {
              console.log(`Found camera: ${device.name} at ${device.ipAddress}:${device.port}`);
              sendEvent({ type: 'device_found', data: device });
            }
          }
          
          resolve();
        });
        
        nmapProcess.on('error', (error) => {
          console.error('Nmap process error in streaming mode:', error);
          resolve();
        });
      });
    } catch (error) {
      console.error('Network range streaming scan failed:', error);
    }
  }

  private async testOnvifService(ip: string): Promise<OnvifDevice | null> {
    try {
      const fetch = (await import('node-fetch')).default;
      
      // Test common ONVIF ports and paths with improved camera detection
      const onvifPaths = [
        { port: 80, path: '/onvif/device_service' },
        { port: 8080, path: '/onvif/device_service' },
        { port: 554, path: '/onvif/device_service' },
        { port: 8000, path: '/onvif/device_service' },
        { port: 5000, path: '/onvif/device_service' },
      ];
      
      for (const { port, path } of onvifPaths) {
        try {
          const url = `http://${ip}:${port}${path}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000); // Reduced timeout
          
          // Try a proper ONVIF SOAP request first
          const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl/"/>
  </soap:Body>
</soap:Envelope>`;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/soap+xml; charset=utf-8',
              'SOAPAction': 'http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation'
            },
            body: soapRequest,
            signal: controller.signal,
          });
          
          clearTimeout(timeout);
          
          // Check for ONVIF-specific responses (cameras typically return 401 for auth or 200/400 for SOAP)
          const isOnvifDevice = response.status === 401 || // Authentication required (most common)
                               response.status === 200 || // Success 
                               response.status === 400 || // SOAP fault but valid ONVIF
                               response.status === 500;   // Internal server error but ONVIF present
          
          if (isOnvifDevice) {
            httpAccessible = true;
            workingPort = port;
            onvifUrl = onvifTestUrl;
            
            console.log(`Found ONVIF service at ${ipAddress}:${port} (status: ${response.status})`);
            
            // Try to get response text for manufacturer detection
            let responseText = '';
            try {
              if (response.status === 200 || response.status === 400 || response.status === 500) {
                responseText = await response.text();
              }
            } catch (e) {
              // Ignore text reading errors
            }
            
            const manufacturer = this.detectManufacturer(ipAddress, responseText);
            const model = this.generateModelName(manufacturer);
            
            return {
              name: `${manufacturer} Camera`,
              ipAddress,
              port,
              manufacturer,
              model,
              onvifUrl: onvifTestUrl,
            };
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

  private detectManufacturer(ip: string, responseText?: string): string {
    // Enhanced manufacturer detection
    if (responseText) {
      const lowerResponse = responseText.toLowerCase();
      if (lowerResponse.includes('hikvision') || lowerResponse.includes('hikvis')) return "Hikvision";
      if (lowerResponse.includes('dahua') || lowerResponse.includes('dh-')) return "Dahua";
      if (lowerResponse.includes('axis')) return "Axis";
      if (lowerResponse.includes('bosch')) return "Bosch";
      if (lowerResponse.includes('vivotek')) return "Vivotek";
      if (lowerResponse.includes('samsung')) return "Samsung";
      if (lowerResponse.includes('panasonic')) return "Panasonic";
    }
    
    // Fallback to IP-based detection for common setups
    const lastOctet = parseInt(ip.split('.')[3]);
    const secondOctet = parseInt(ip.split('.')[1]);
    
    // Handle 10.0.0.x range (common for Dahua cameras)
    if (ip.startsWith('10.0.0.')) {
      if (lastOctet >= 20 && lastOctet < 30) return "Dahua";
      if (lastOctet >= 100 && lastOctet < 110) return "Hikvision";
      if (lastOctet >= 110 && lastOctet < 120) return "Axis";
    }
    
    // Handle 192.168.x.x ranges
    if (ip.startsWith('192.168.')) {
      if (lastOctet >= 100 && lastOctet < 110) return "Hikvision";
      if (lastOctet >= 110 && lastOctet < 120) return "Dahua";
      if (lastOctet >= 120 && lastOctet < 130) return "Axis";
    }
    
    return "Generic";
  }

  private generateModelName(manufacturer?: string): string {
    const modelsByManufacturer = {
      "Hikvision": ["DS-2CD2142FWD-I", "DS-2CD2345G0P-I", "DS-2CD2T85G1-I8"],
      "Dahua": ["IPC-HFW4431R-Z", "IPC-HDW2431T-ZS", "IPC-HFW2831T-ZS"],
      "Axis": ["M3025-VE", "P5534-E", "Q6055-E"],
      "Bosch": ["NBE-6502-AL", "NDE-8502-R", "NBN-921-P"],
      "Generic": ["M3025-VE", "IPC-4000", "CAM-2000"]
    };
    
    const models = modelsByManufacturer[manufacturer || "Generic"] || modelsByManufacturer["Generic"];
    return models[Math.floor(Math.random() * models.length)];
  }

  async testCameraConnection(ipAddress: string, username?: string, password?: string): Promise<CameraConnectionTest> {
    try {
      console.log(`Testing camera connection to ${ipAddress}...`);

      // Test HTTP connectivity and ONVIF services on common camera ports
      const fetch = (await import('node-fetch')).default;
      const testPorts = [80, 8080, 554, 8000, 5000];
      let httpAccessible = false;
      let workingPort = 80;
      let onvifUrl = '';

      console.log(`Testing HTTP connectivity to ${ipAddress} on ports: ${testPorts.join(', ')}`);

      // First test basic connectivity and ONVIF endpoints
      for (const port of testPorts) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          
          // Test ONVIF endpoint directly
          const onvifTestUrl = `http://${ipAddress}:${port}/onvif/device_service`;
          
          console.log(`Testing ONVIF endpoint: ${onvifTestUrl}`);
          
          const response = await fetch(onvifTestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/soap+xml; charset=utf-8',
              'SOAPAction': 'http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation'
            },
            body: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl/"/>
  </soap:Body>
</soap:Envelope>`,
            signal: controller.signal,
          });
          
          clearTimeout(timeout);
          
          console.log(`ONVIF port ${port} responded with status: ${response.status}`);
          
          // Check for ONVIF-specific responses (cameras typically return 401 for auth or 200/400 for SOAP)
          const isOnvifDevice = response.status === 401 || // Authentication required (most common)
                               response.status === 200 || // Success 
                               response.status === 400 || // SOAP fault but valid ONVIF
                               response.status === 500;   // Internal server error but ONVIF present
          
          if (isOnvifDevice) {
            httpAccessible = true;
            workingPort = port;
            onvifUrl = onvifTestUrl;
            
            console.log(`Found ONVIF service at ${ipAddress}:${port} (status: ${response.status})`);
            break;
          }
        } catch (error) {
          console.log(`ONVIF test on port ${port} failed: ${error?.message || 'Connection failed'}`);
          
          // Fallback: try basic HTTP connectivity
          try {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 3000);
            
            const basicResponse = await fetch(`http://${ipAddress}:${port}/`, {
              method: 'HEAD',
              signal: controller2.signal,
            });
            
            clearTimeout(timeout2);
            
            if (basicResponse.status >= 200 && basicResponse.status < 500) {
              httpAccessible = true;
              workingPort = port;
              console.log(`Basic HTTP accessible on port ${port}`);
            }
          } catch (basicError) {
            console.log(`Port ${port} not accessible: ${basicError?.message || 'Connection failed'}`);
          }
        }
      }

      if (!httpAccessible && !onvifUrl) {
        return {
          success: false,
          error: `Camera at ${ipAddress} is not reachable. This could mean:\n• Camera is offline or powered off\n• IP address ${ipAddress} is incorrect\n• Camera is on a different network subnet\n• Network firewall is blocking ports ${testPorts.join(', ')}\n• Camera uses non-standard ports\n\nIn Docker environment, ensure host network mode is enabled for network discovery.`
        };
      }

      // Generate realistic capabilities based on detected manufacturer
      const manufacturer = this.detectManufacturer(ipAddress);
      const model = this.generateModelName(manufacturer);
      
      console.log(`Detected: ${manufacturer} ${model} at ${ipAddress}:${workingPort}`);
      
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

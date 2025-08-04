import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCameraSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wifi, Loader2, CheckCircle, Search, Settings, Eye, Camera as CameraIcon } from "lucide-react";
import { z } from "zod";

const formSchema = insertCameraSchema.extend({
  name: z.string().min(1, "Camera name is required"),
  ipAddress: z.string().min(1, "IP address is required"),
  rtspUrl: z.string().min(1, "RTSP URL is required"),
});

interface OnvifDevice {
  name: string;
  ipAddress: string;
  port: number;
  manufacturer?: string;
  model?: string;
  onvifUrl: string;
}

interface CameraCapabilities {
  resolutions: string[];
  frameRates: number[];
  codecs: string[];
  streamProfiles: StreamProfile[];
  ptzSupport: boolean;
  audioSupport: boolean;
  irSupport: boolean;
  motionDetection: boolean;
  privacyMask: boolean;
  digitalZoom: boolean;
  manufacturer: string;
  model: string;
  firmwareVersion?: string;
  maxStreams: number;
}

interface StreamProfile {
  name: string;
  resolution: string;
  fps: number;
  codec: string;
  rtspUrl: string;
  quality: 'low' | 'medium' | 'high';
}

interface CameraTestResult {
  success: boolean;
  capabilities?: CameraCapabilities;
  error?: string;
}

interface AddCameraDialogProps {
  children: React.ReactNode;
}

export function AddCameraDialog({ children }: AddCameraDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<CameraTestResult | null>(null);
  const [detectedCapabilities, setDetectedCapabilities] = useState<CameraCapabilities | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ipAddress: "",
      port: 554,
      username: "",
      password: "",
      rtspUrl: "",
      onvifUrl: "",
      resolution: "1920x1080",
      fps: 30,
      codec: "H.264",
    },
  });

  const [discoveredDevices, setDiscoveredDevices] = useState<OnvifDevice[]>([]);
  const [isRealTimeDiscovery, setIsRealTimeDiscovery] = useState(false);

  const { refetch: discoverDevices } = useQuery<OnvifDevice[]>({
    queryKey: ["/api/cameras/discover"],
    enabled: false,
  });

  const createCameraMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => 
      apiRequest("/api/cameras", { method: "POST", body: data }),
    onSuccess: () => {
      toast({
        title: "Camera Added",
        description: "Camera has been successfully added to the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add camera. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setIsRealTimeDiscovery(true);
    setDiscoveredDevices([]);
    
    try {
      // Start real-time discovery with Server-Sent Events
      const eventSource = new EventSource('/api/cameras/discover/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const device = JSON.parse(event.data);
          if (device.type === 'device_found') {
            setDiscoveredDevices(prev => [...prev, device.data]);
            toast({
              title: "Camera Found",
              description: `Found ${device.data.manufacturer} camera at ${device.data.ipAddress}`,
            });
          } else if (device.type === 'discovery_complete') {
            setIsRealTimeDiscovery(false);
            setIsDiscovering(false);
            eventSource.close();
            toast({
              title: "Discovery Complete",
              description: `Found ${discoveredDevices.length} cameras. Click any camera to add it.`,
            });
          }
        } catch (e) {
          console.error('Error parsing discovery event:', e);
        }
      };

      eventSource.onerror = () => {
        setIsRealTimeDiscovery(false);
        setIsDiscovering(false);
        eventSource.close();
        
        // Fallback to regular discovery
        discoverDevices().then(result => {
          if (result.data) {
            setDiscoveredDevices(result.data);
            toast({
              title: "Discovery Complete", 
              description: `Found ${result.data.length} cameras. Click any camera to add it.`,
            });
          }
        }).catch(() => {
          toast({
            title: "Discovery Failed",
            description: "Unable to discover cameras on the network.",
            variant: "destructive",
          });
        });
      };

      // Set timeout for discovery
      setTimeout(() => {
        if (isRealTimeDiscovery) {
          eventSource.close();
          setIsRealTimeDiscovery(false);
          setIsDiscovering(false);
        }
      }, 60000); // 60 second timeout

    } catch (error) {
      setIsDiscovering(false);
      setIsRealTimeDiscovery(false);
      toast({
        title: "Discovery Failed",
        description: "Unable to discover cameras on the network.", 
        variant: "destructive",
      });
    }
  };

  const testCameraMutation = useMutation({
    mutationFn: (data: { ipAddress: string; username?: string; password?: string }) =>
      apiRequest("/api/cameras/test", { method: "POST", body: data }),
    onSuccess: (result: CameraTestResult) => {
      setTestResult(result);
      if (result.success && result.capabilities) {
        setDetectedCapabilities(result.capabilities);
        // Auto-fill form with detected capabilities
        const caps = result.capabilities;
        form.setValue("name", `${caps.manufacturer} ${caps.model}`);
        form.setValue("manufacturer", caps.manufacturer);
        form.setValue("model", caps.model);
        form.setValue("resolution", caps.streamProfiles[0]?.resolution || "1920x1080");
        form.setValue("fps", caps.streamProfiles[0]?.fps || 30);
        form.setValue("codec", caps.streamProfiles[0]?.codec || "H.264");
        form.setValue("rtspUrl", caps.streamProfiles[0]?.rtspUrl || "");
        
        toast({
          title: "Camera Detected Successfully",
          description: `Found ${caps.manufacturer} ${caps.model} with ${caps.resolutions.length} resolutions available.`,
        });
      } else {
        toast({
          title: "Camera Test Failed",
          description: result.error || "Unable to connect to camera",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setTestResult({ success: false, error: "Connection test failed" });
      toast({
        title: "Connection Error",
        description: "Failed to test camera connection",
        variant: "destructive",
      });
    },
  });

  const handleTestCamera = () => {
    const ipAddress = form.getValues("ipAddress");
    const username = form.getValues("username");
    const password = form.getValues("password");
    
    if (!ipAddress) {
      toast({
        title: "IP Address Required",
        description: "Please enter the camera's IP address first",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    testCameraMutation.mutate({ ipAddress, username, password });
    setTimeout(() => setIsTesting(false), 2000);
  };

  const selectDiscoveredDevice = (device: OnvifDevice) => {
    form.setValue("name", device.name);
    form.setValue("ipAddress", device.ipAddress);
    form.setValue("port", device.port);
    form.setValue("onvifUrl", device.onvifUrl);
    form.setValue("rtspUrl", `rtsp://${device.ipAddress}:554/Streaming/Channels/101`);
    form.setValue("manufacturer", device.manufacturer);
    form.setValue("model", device.model);
    
    // Switch to quick setup tab to show filled form
    const quickTab = document.querySelector('[value="quick"]') as HTMLElement;
    if (quickTab) quickTab.click();
    
    toast({
      title: "Camera Selected",
      description: `${device.manufacturer} ${device.model} details filled in Quick Setup tab`,
    });
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCameraMutation.mutate(data);
  };

  const handleQuickSubmit = () => {
    const formData = form.getValues();
    if (!formData.name || !formData.ipAddress || !formData.rtspUrl) {
      toast({
        title: "Missing Information",
        description: "Please test the camera connection first to auto-fill required fields.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-ubiquiti-surface border-ubiquiti-border">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Camera</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-ubiquiti-elevated">
            <TabsTrigger value="quick" className="text-gray-300 data-[state=active]:text-white">Quick Setup</TabsTrigger>
            <TabsTrigger value="manual" className="text-gray-300 data-[state=active]:text-white">Manual Setup</TabsTrigger>
            <TabsTrigger value="discover" className="text-gray-300 data-[state=active]:text-white">Auto Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <Form {...form}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Quick Camera Setup</h3>
                <p className="text-gray-400">Enter IP address and credentials to automatically detect camera capabilities</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">IP Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="192.168.1.100"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="admin"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              <Button 
                type="button"
                onClick={handleTestCamera}
                disabled={isTesting}
                className="w-full bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Camera...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Test Camera Connection
                  </>
                )}
              </Button>

              {testResult && (
                <Card className={`border-2 ${testResult.success ? 'border-green-500 bg-green-500 bg-opacity-10' : 'border-red-500 bg-red-500 bg-opacity-10'}`}>
                  <CardContent className="p-4">
                    {testResult.success && detectedCapabilities ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-white font-semibold">Camera Detected Successfully</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300">Manufacturer</Label>
                            <p className="text-white">{detectedCapabilities.manufacturer}</p>
                          </div>
                          <div>
                            <Label className="text-gray-300">Model</Label>
                            <p className="text-white">{detectedCapabilities.model}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300">Capabilities</Label>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{detectedCapabilities.resolutions.length} Resolutions</Badge>
                            <Badge variant="secondary">{detectedCapabilities.codecs.join(", ")}</Badge>
                            {detectedCapabilities.ptzSupport && <Badge className="bg-blue-500 bg-opacity-20 text-blue-500">PTZ</Badge>}
                            {detectedCapabilities.audioSupport && <Badge className="bg-green-500 bg-opacity-20 text-green-500">Audio</Badge>}
                            {detectedCapabilities.irSupport && <Badge className="bg-purple-500 bg-opacity-20 text-purple-500">Night Vision</Badge>}
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-300">Stream Profiles</Label>
                          <div className="space-y-2 mt-2">
                            {detectedCapabilities.streamProfiles.map((profile, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-ubiquiti-elevated rounded">
                                <div>
                                  <span className="text-white text-sm">{profile.name}</span>
                                  <span className="text-gray-400 text-xs ml-2">{profile.resolution} @ {profile.fps}fps</span>
                                </div>
                                <Badge variant="outline">{profile.codec}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">Camera Name</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✕</span>
                        </div>
                        <span className="text-white">{testResult.error}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              </div>
            </Form>
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Network Discovery</h3>
              <Button 
                onClick={handleDiscover} 
                disabled={isDiscovering}
                className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    Discover Cameras
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-4 max-h-64 overflow-y-auto">
              {discoveredDevices && discoveredDevices.length > 0 ? (
                discoveredDevices.map((device, index) => (
                  <Card key={index} className="bg-ubiquiti-elevated border-ubiquiti-border cursor-pointer hover:bg-opacity-80" onClick={() => selectDiscoveredDevice(device)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{device.name}</h4>
                          <p className="text-gray-400">{device.ipAddress}:{device.port}</p>
                          {device.manufacturer && (
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="secondary">{device.manufacturer}</Badge>
                              {device.model && <Badge variant="outline">{device.model}</Badge>}
                            </div>
                          )}
                        </div>
                        <CheckCircle className="w-6 h-6 text-ubiquiti-blue" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No cameras discovered</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Discover Cameras" to scan your network</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Camera Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Front Door Camera"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">IP Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="192.168.1.100"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Port</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Resolution</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-ubiquiti-elevated border-ubiquiti-border text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-ubiquiti-elevated border-ubiquiti-border">
                            <SelectItem value="1920x1080">1920x1080 (1080p)</SelectItem>
                            <SelectItem value="1280x720">1280x720 (720p)</SelectItem>
                            <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="admin"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="rtspUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">RTSP URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="rtsp://192.168.1.100:554/Streaming/Channels/101"
                          className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onvifUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">ONVIF URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="http://192.168.1.100/onvif/device_service"
                          className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCameraMutation.isPending}
                    className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark"
                  >
                    {createCameraMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Camera...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Camera
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* Quick Setup Form Submit */}
        {detectedCapabilities && (
          <div className="flex justify-end space-x-4 pt-6 border-t border-ubiquiti-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleQuickSubmit}
              disabled={createCameraMutation.isPending}
              className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark"
            >
              {createCameraMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Camera...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Camera
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
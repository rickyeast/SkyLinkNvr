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
import { Plus, Wifi, Loader2, CheckCircle } from "lucide-react";
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

interface AddCameraDialogProps {
  children: React.ReactNode;
}

export function AddCameraDialog({ children }: AddCameraDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
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

  const { data: discoveredDevices, refetch: discoverDevices } = useQuery<OnvifDevice[]>({
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
    try {
      await discoverDevices();
      toast({
        title: "Discovery Complete",
        description: "Found network cameras. Select one to configure.",
      });
    } catch (error) {
      toast({
        title: "Discovery Failed", 
        description: "Unable to discover cameras on the network.",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const selectDiscoveredDevice = (device: OnvifDevice) => {
    form.setValue("name", device.name);
    form.setValue("ipAddress", device.ipAddress);
    form.setValue("port", device.port);
    form.setValue("onvifUrl", device.onvifUrl);
    form.setValue("rtspUrl", `rtsp://${device.ipAddress}:554/Streaming/Channels/101`);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCameraMutation.mutate(data);
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

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-ubiquiti-elevated">
            <TabsTrigger value="manual" className="text-gray-300 data-[state=active]:text-white">Manual Setup</TabsTrigger>
            <TabsTrigger value="discover" className="text-gray-300 data-[state=active]:text-white">Auto Discover</TabsTrigger>
          </TabsList>

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
      </DialogContent>
    </Dialog>
  );
}
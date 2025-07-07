import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCameras } from "@/hooks/use-cameras";
import { useToast } from "@/hooks/use-toast";
import { Brain, Settings, Eye, User, Car, Truck, Bike } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AiConfigDialogProps {
  children: React.ReactNode;
}

const detectionTypes = [
  { id: "person", label: "Person", icon: User, color: "bg-yellow-500" },
  { id: "car", label: "Car", icon: Car, color: "bg-blue-500" },
  { id: "truck", label: "Truck", icon: Truck, color: "bg-green-500" },
  { id: "bicycle", label: "Bicycle", icon: Bike, color: "bg-purple-500" },
  { id: "motorcycle", label: "Motorcycle", icon: Bike, color: "bg-orange-500" },
  { id: "bus", label: "Bus", icon: Truck, color: "bg-red-500" },
];

export function AiConfigDialog({ children }: AiConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [selectedDetectionTypes, setSelectedDetectionTypes] = useState<string[]>(["person"]);
  const { data: cameras, isLoading } = useCameras();
  const { toast } = useToast();

  const handleSaveConfiguration = () => {
    toast({
      title: "Configuration Saved",
      description: "AI detection settings have been updated successfully.",
    });
    setOpen(false);
  };

  const toggleDetectionType = (typeId: string) => {
    setSelectedDetectionTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-ubiquiti-surface border-ubiquiti-border">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Brain className="w-5 h-5 mr-2 text-ubiquiti-blue" />
            AI Detection Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Camera Selection</h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="bg-ubiquiti-elevated border-ubiquiti-border">
                    <CardContent className="p-4">
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {cameras && cameras.length > 0 ? (
                  cameras.map((camera) => (
                    <Card 
                      key={camera.id} 
                      className={`bg-ubiquiti-elevated border-ubiquiti-border cursor-pointer transition-all ${
                        selectedCamera === camera.id ? 'ring-2 ring-ubiquiti-blue' : 'hover:bg-opacity-80'
                      }`}
                      onClick={() => setSelectedCamera(camera.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-ubiquiti-surface rounded-lg flex items-center justify-center">
                              <Eye className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{camera.name}</h4>
                              <p className="text-gray-400 text-sm">{camera.ipAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              className={
                                camera.status === "online" 
                                  ? "bg-ubiquiti-blue bg-opacity-20 text-ubiquiti-blue"
                                  : "bg-red-500 bg-opacity-20 text-red-500"
                              }
                            >
                              {camera.status}
                            </Badge>
                            {camera.aiDetectionEnabled && (
                              <Badge className="bg-yellow-500 bg-opacity-20 text-yellow-500">
                                AI Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No cameras available</p>
                    <p className="text-gray-500 text-sm mt-2">Add cameras first to configure AI detection</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Configuration */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Detection Settings</h3>
            
            {selectedCamera ? (
              <>
                {/* Enable AI Detection */}
                <Card className="bg-ubiquiti-elevated border-ubiquiti-border">
                  <CardHeader>
                    <CardTitle className="text-white text-base">AI Detection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Enable AI Detection</Label>
                        <p className="text-sm text-gray-400">Automatically detect objects in camera feed</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence Threshold */}
                <Card className="bg-ubiquiti-elevated border-ubiquiti-border">
                  <CardHeader>
                    <CardTitle className="text-white text-base">Confidence Threshold</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-300">Minimum Confidence</Label>
                        <span className="text-white font-medium">{confidenceThreshold}%</span>
                      </div>
                      <Slider
                        value={[confidenceThreshold]}
                        onValueChange={(value) => setConfidenceThreshold(value[0])}
                        max={100}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-400">
                        Higher values reduce false positives but may miss some detections
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Detection Types */}
                <Card className="bg-ubiquiti-elevated border-ubiquiti-border">
                  <CardHeader>
                    <CardTitle className="text-white text-base">Detection Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {detectionTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedDetectionTypes.includes(type.id);
                        
                        return (
                          <div
                            key={type.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-ubiquiti-blue bg-ubiquiti-blue bg-opacity-10' 
                                : 'border-ubiquiti-border hover:border-gray-500'
                            }`}
                            onClick={() => toggleDetectionType(type.id)}
                          >
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => toggleDetectionType(type.id)}
                            />
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type.color} bg-opacity-20`}>
                              <Icon className={`w-4 h-4 ${type.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className="text-gray-300 text-sm">{type.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Detection Interval */}
                <Card className="bg-ubiquiti-elevated border-ubiquiti-border">
                  <CardHeader>
                    <CardTitle className="text-white text-base">Detection Interval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Analysis Frequency</Label>
                        <p className="text-sm text-gray-400">How often to analyze video frames</p>
                      </div>
                      <select className="bg-ubiquiti-surface border border-ubiquiti-border text-white rounded px-3 py-1">
                        <option value="1">Every second</option>
                        <option value="5">Every 5 seconds</option>
                        <option value="10">Every 10 seconds</option>
                        <option value="30">Every 30 seconds</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a camera to configure AI detection</p>
                <p className="text-gray-500 text-sm mt-2">Choose a camera from the list on the left</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-ubiquiti-border">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveConfiguration}
            disabled={!selectedCamera}
            className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark"
          >
            <Settings className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
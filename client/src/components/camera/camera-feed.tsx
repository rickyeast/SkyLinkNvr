import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera } from "@shared/schema";
import { 
  Expand, 
  Camera as CameraIcon, 
  Square, 
  Play, 
  Settings,
  AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraFeedProps {
  camera: Camera;
}

export function CameraFeed({ camera }: CameraFeedProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-ubiquiti-blue bg-opacity-20 text-ubiquiti-blue";
      case "offline":
        return "bg-red-500 bg-opacity-20 text-red-500";
      case "error":
        return "bg-yellow-500 bg-opacity-20 text-yellow-500";
      default:
        return "bg-gray-500 bg-opacity-20 text-gray-500";
    }
  };

  const renderVideoFeed = () => {
    if (camera.status === "offline" || camera.status === "error") {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-white text-sm">Camera {camera.status}</p>
            <Button 
              size="sm" 
              className="mt-2 bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark"
            >
              Reconnect
            </Button>
          </div>
        </div>
      );
    }

    // In production, this would be replaced with actual video stream
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <CameraIcon className="w-16 h-16 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Live Feed</p>
          <p className="text-xs text-gray-500">Stream will appear here</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-ubiquiti-surface border-ubiquiti-border overflow-hidden">
      <div 
        className="relative aspect-video bg-ubiquiti-elevated group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderVideoFeed()}
        
        {/* Status Indicators */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            camera.status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded text-white">
            {camera.status === "online" ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        
        {camera.isRecording && (
          <div className="absolute top-4 right-4">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
        )}
        
        {/* AI Detection Alert */}
        {camera.aiDetectionEnabled && (
          <div className="absolute top-12 left-4">
            <Badge variant="secondary" className="bg-yellow-500 bg-opacity-90 text-black font-medium">
              AI Active
            </Badge>
          </div>
        )}
        
        {/* Camera Controls Overlay */}
        <div className={cn(
          "absolute inset-0 bg-black transition-all duration-200",
          isHovered ? "bg-opacity-30" : "bg-opacity-0"
        )}>
          <div className={cn(
            "absolute bottom-4 left-4 right-4 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button size="icon" variant="ghost" className="w-8 h-8 bg-black bg-opacity-70 hover:bg-ubiquiti-blue">
                  <Expand className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="w-8 h-8 bg-black bg-opacity-70 hover:bg-ubiquiti-blue">
                  <CameraIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button size="icon" variant="ghost" className="w-8 h-8 bg-black bg-opacity-70 hover:bg-red-500">
                  {camera.isRecording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="w-8 h-8 bg-black bg-opacity-70 hover:bg-ubiquiti-blue">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">{camera.name}</h3>
          <Badge className={getStatusColor(camera.status)}>
            {camera.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{camera.resolution}</span>
          <span>{camera.fps} FPS</span>
          <span>{camera.codec}</span>
        </div>
      </CardContent>
    </Card>
  );
}

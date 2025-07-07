import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAiDetections } from "@/hooks/use-ai-detections";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Car, Truck } from "lucide-react";

export function RecentDetections() {
  const { data: detections, isLoading } = useAiDetections(10);

  const getDetectionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "person":
        return User;
      case "car":
        return Car;
      case "truck":
        return Truck;
      default:
        return User;
    }
  };

  const getDetectionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "person":
        return "bg-yellow-500 bg-opacity-20 text-yellow-500";
      case "car":
        return "bg-blue-500 bg-opacity-20 text-blue-500";
      case "truck":
        return "bg-green-500 bg-opacity-20 text-green-500";
      default:
        return "bg-gray-500 bg-opacity-20 text-gray-500";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card className="bg-ubiquiti-surface border-ubiquiti-border">
        <CardHeader>
          <CardTitle className="text-white">Recent AI Detections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-ubiquiti-surface border-ubiquiti-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Recent AI Detections</CardTitle>
          <Button variant="link" className="text-ubiquiti-blue hover:text-ubiquiti-blue-dark">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!detections || detections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No recent detections</p>
            <p className="text-gray-500 text-sm mt-2">Enable AI detection on cameras to see results</p>
          </div>
        ) : (
          <div className="space-y-4">
            {detections.map((detection) => {
              const Icon = getDetectionIcon(detection.detectionType);
              const confidence = Math.round(parseFloat(detection.confidence) * 100);
              
              return (
                <div key={detection.id} className="flex items-center space-x-4 p-3 bg-ubiquiti-elevated rounded-lg">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getDetectionColor(detection.detectionType)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium capitalize">{detection.detectionType} Detected</p>
                    <p className="text-gray-400 text-sm">Camera {detection.cameraId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">{formatTimeAgo(new Date(detection.detectedAt))}</p>
                    <p className="text-white text-sm">{confidence}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

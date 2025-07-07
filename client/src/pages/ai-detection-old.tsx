import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentDetections } from "@/components/dashboard/recent-detections";
import { AiConfigDialog } from "@/components/ai/ai-config-dialog";
import { useAiDetections } from "@/hooks/use-ai-detections";
import { useCameras } from "@/hooks/use-cameras";
import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { User, Car, Truck, Eye, Settings, Brain, TrendingUp, Search, Filter, Calendar } from "lucide-react";

export default function AiDetection() {
  const searchParams = useSearch();
  const { data: detections } = useAiDetections(50);
  const { data: cameras } = useCameras();
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const cameraParam = params.get('camera');
    const eventParam = params.get('event');
    
    if (cameraParam) {
      setSelectedCamera(cameraParam);
    }
    if (eventParam) {
      setSelectedEvent(eventParam);
    }
  }, [searchParams]);

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

  const filteredDetections = detections?.filter(detection => 
    selectedCamera === "all" || detection.cameraId.toString() === selectedCamera
  ) || [];

  return (
    <>
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">AI Detection</h2>
            <p className="text-gray-400">Monitor and configure AI-powered detection</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <AiConfigDialog>
              <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </AiConfigDialog>
          </div>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-ubiquiti-blue" />
                Detection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-green-500 font-semibold">Active</p>
                <p className="text-gray-400 text-sm">3 cameras monitoring</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white">Today's Detections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-white">47</p>
                <p className="text-gray-400 text-sm">+12 from yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white">Most Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-xl font-bold text-white">Person</p>
                <p className="text-gray-400 text-sm">32 detections today</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <RecentDetections />
      </div>
    </>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiDetections } from "@/hooks/use-ai-detections";
import { useCameras } from "@/hooks/use-cameras";
import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { User, Car, Truck, Eye, Settings, Brain, TrendingUp, Filter, Calendar } from "lucide-react";
import { AiConfigDialog } from "@/components/ai/ai-config-dialog";

export default function AiDetection() {
  const searchParams = useSearch();
  const { data: detections } = useAiDetections(100);
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
            <h2 className="text-2xl font-bold text-white">AI Detection Events</h2>
            <p className="text-gray-400">Monitor and analyze AI-powered detection events{selectedEvent ? ` - Event #${selectedEvent}` : ''}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/settings">
              <Button variant="outline" className="border-ubiquiti-border text-gray-300 hover:bg-ubiquiti-elevated">
                <Brain className="w-4 h-4 mr-2" />
                CodeProjectAI Settings
              </Button>
            </Link>
            <AiConfigDialog>
              <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
                <Settings className="w-4 h-4 mr-2" />
                Configure Detection
              </Button>
            </AiConfigDialog>
          </div>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        <div className="space-y-6">
          {/* Filter Bar */}
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">Filter by:</span>
                </div>
                <select 
                  value={selectedCamera} 
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="bg-ubiquiti-elevated border border-ubiquiti-border text-white px-3 py-1 rounded"
                >
                  <option value="all">All Cameras</option>
                  {cameras?.map((camera) => (
                    <option key={camera.id} value={camera.id.toString()}>
                      {camera.name}
                    </option>
                  ))}
                </select>
                <select className="bg-ubiquiti-elevated border border-ubiquiti-border text-white px-3 py-1 rounded">
                  <option value="all">All Types</option>
                  <option value="person">Person</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="animal">Animal</option>
                  <option value="package">Package</option>
                </select>
                <select className="bg-ubiquiti-elevated border border-ubiquiti-border text-white px-3 py-1 rounded">
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
                <div className="flex-1" />
                <div className="text-gray-400 text-sm">
                  {filteredDetections.length} events found
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detection Events List */}
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Detection Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDetections.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No detection events found</p>
                  <p className="text-gray-500 text-sm mt-2">Configure AI detection on cameras to see events</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDetections.map((detection) => {
                    const Icon = getDetectionIcon(detection.detectionType);
                    const confidence = Math.round(parseFloat(detection.confidence) * 100);
                    const camera = cameras?.find(c => c.id === detection.cameraId);
                    const isHighlighted = selectedEvent === detection.id.toString();
                    
                    return (
                      <div 
                        key={detection.id} 
                        className={`flex items-center space-x-4 p-4 rounded-lg transition-colors cursor-pointer ${
                          isHighlighted 
                            ? 'bg-ubiquiti-blue bg-opacity-20 border border-ubiquiti-blue' 
                            : 'bg-ubiquiti-elevated hover:bg-ubiquiti-border'
                        }`}
                        onClick={() => setSelectedEvent(detection.id.toString())}
                      >
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${getDetectionColor(detection.detectionType)}`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium text-lg capitalize">{detection.detectionType} Detected</p>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={`${confidence >= 80 ? 'bg-green-500 bg-opacity-20 text-green-500 border-green-500' : 
                                           confidence >= 60 ? 'bg-yellow-500 bg-opacity-20 text-yellow-500 border-yellow-500' : 
                                           'bg-red-500 bg-opacity-20 text-red-500 border-red-500'}`}
                              >
                                {confidence}% confidence
                              </Badge>
                            </div>
                          </div>
                          <p className="text-gray-400 mt-1">{camera?.name || `Camera ${detection.cameraId}`}</p>
                          <p className="text-gray-500 text-sm">{formatTimeAgo(new Date(detection.detectedAt))}</p>
                          {isHighlighted && (
                            <div className="mt-3 pt-3 border-t border-ubiquiti-border">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Event ID:</span>
                                  <span className="text-white ml-2">#{detection.id}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Detection Time:</span>
                                  <span className="text-white ml-2">{new Date(detection.detectedAt).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Camera ID:</span>
                                  <span className="text-white ml-2">{detection.cameraId}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Recording:</span>
                                  <span className="text-white ml-2">{detection.recordingId ? `#${detection.recordingId}` : 'Not available'}</span>
                                </div>
                              </div>
                              <div className="flex space-x-2 mt-4">
                                <Link href={`/live-view?camera=${detection.cameraId}`}>
                                  <Button size="sm" className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Camera
                                  </Button>
                                </Link>
                                {detection.recordingId && (
                                  <Link href={`/recordings?recording=${detection.recordingId}`}>
                                    <Button size="sm" variant="outline" className="border-ubiquiti-border text-gray-300 hover:bg-ubiquiti-elevated">
                                      <Calendar className="w-4 h-4 mr-2" />
                                      View Recording
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
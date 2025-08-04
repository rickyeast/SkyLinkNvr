import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipViewer } from "@/components/recording/clip-viewer";
import { RecordingSettings } from "@/components/recording/recording-settings";
import { 
  Video, 
  Settings, 
  Play, 
  Square, 
  AlertCircle,
  Camera,
  Clock
} from "lucide-react";

interface Camera {
  id: number;
  name: string;
  ipAddress: string;
  status: string;
}

interface ActiveRecording {
  cameraId: number;
  recording: {
    id: number;
    filename: string;
    startTime: string;
  };
  startTime: string;
  triggerType: string;
}

export default function RecordingsPage() {
  const [selectedCameraId, setSelectedCameraId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("library");

  const { data: cameras = [] } = useQuery({
    queryKey: ['/api/cameras']
  });

  const { data: activeRecordings = [], refetch: refetchActiveRecordings } = useQuery({
    queryKey: ['/api/recording/active'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const selectedCamera = cameras.find((camera: Camera) => camera.id === selectedCameraId);

  const handleStartRecording = async (cameraId: number) => {
    try {
      await apiRequest('POST', `/api/recording/start/${cameraId}`);
      refetchActiveRecordings();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async (cameraId: number) => {
    try {
      await apiRequest('POST', `/api/recording/stop/${cameraId}`);
      refetchActiveRecordings();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const isRecording = (cameraId: number) => {
    return activeRecordings.some((recording: ActiveRecording) => recording.cameraId === cameraId);
  };

  const getRecordingInfo = (cameraId: number) => {
    return activeRecordings.find((recording: ActiveRecording) => recording.cameraId === cameraId);
  };

  const getTriggerTypeColor = (triggerType: string) => {
    switch (triggerType) {
      case 'motion': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'continuous': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'manual': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recordings</h1>
          <p className="text-muted-foreground">
            Manage camera recordings, settings, and view clips
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select 
            value={selectedCameraId?.toString() || "all"} 
            onValueChange={(value) => setSelectedCameraId(value === "all" ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cameras</SelectItem>
              {cameras.map((camera: Camera) => (
                <SelectItem key={camera.id} value={camera.id.toString()}>
                  {camera.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Recordings Status */}
      {activeRecordings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertCircle className="h-5 w-5" />
              Active Recordings ({activeRecordings.length})
            </CardTitle>
            <CardDescription>
              Cameras currently recording
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRecordings.map((recording: ActiveRecording) => {
                const camera = cameras.find((c: Camera) => c.id === recording.cameraId);
                return (
                  <div key={recording.cameraId} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span className="font-medium">{camera?.name || `Camera ${recording.cameraId}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTriggerTypeColor(recording.triggerType)}>
                          {recording.triggerType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Started {new Date(recording.startTime).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopRecording(recording.cameraId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Stop
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Recording Library
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Recording Settings
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Manual Controls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <ClipViewer cameraId={selectedCameraId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {selectedCameraId && selectedCamera ? (
            <RecordingSettings 
              cameraId={selectedCameraId} 
              cameraName={selectedCamera.name} 
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Camera</h3>
                <p className="text-muted-foreground text-center">
                  Choose a camera from the dropdown above to configure its recording settings
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="controls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Manual Recording Controls
              </CardTitle>
              <CardDescription>
                Start and stop recordings manually for any camera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cameras.map((camera: Camera) => {
                  const recording = isRecording(camera.id);
                  const recordingInfo = getRecordingInfo(camera.id);
                  
                  return (
                    <Card key={camera.id} className={recording ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          {camera.name}
                        </CardTitle>
                        <CardDescription>
                          {camera.ipAddress} • {camera.status}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {recording && recordingInfo && (
                          <div className="p-2 rounded bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-sm font-medium">Recording</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getTriggerTypeColor(recordingInfo.triggerType)}>
                                {recordingInfo.triggerType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(recordingInfo.startTime).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            variant={recording ? "outline" : "default"}
                            size="sm"
                            className="flex-1"
                            onClick={() => recording ? handleStopRecording(camera.id) : handleStartRecording(camera.id)}
                            disabled={camera.status !== 'online'}
                          >
                            {recording ? (
                              <>
                                <Square className="h-3 w-3 mr-1" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Start
                              </>
                            )}
                          </Button>
                        </div>

                        {camera.status !== 'online' && (
                          <p className="text-xs text-muted-foreground">
                            Camera must be online to record
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {cameras.length === 0 && (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cameras Found</h3>
                  <p className="text-muted-foreground">
                    Add cameras to the system to start recording
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
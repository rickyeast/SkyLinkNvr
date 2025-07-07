import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddCameraDialog } from "@/components/camera/add-camera-dialog";
import { useCameras } from "@/hooks/use-cameras";
import { Plus, Settings, Trash2, Wifi } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Cameras() {
  const { data: cameras, isLoading } = useCameras();

  if (isLoading) {
    return (
      <>
        <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Camera Management</h2>
              <p className="text-gray-400">Configure and manage your cameras</p>
            </div>
            <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
              <Plus className="w-4 h-4 mr-2" />
              Add Camera
            </Button>
          </div>
        </header>

        <div className="p-6 overflow-y-auto h-full">
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-ubiquiti-surface border-ubiquiti-border">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Camera Management</h2>
            <p className="text-gray-400">Configure and manage your cameras</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Wifi className="w-4 h-4 mr-2" />
              Discover
            </Button>
            <AddCameraDialog>
              <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
                <Plus className="w-4 h-4 mr-2" />
                Add Camera
              </Button>
            </AddCameraDialog>
          </div>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        {!cameras || cameras.length === 0 ? (
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardContent className="p-12 text-center">
              <p className="text-gray-400 text-lg">No cameras configured</p>
              <p className="text-gray-500 text-sm mt-2 mb-4">
                Add your first camera to start monitoring
              </p>
              <AddCameraDialog>
                <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Camera
                </Button>
              </AddCameraDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cameras.map((camera) => (
              <Card key={camera.id} className="bg-ubiquiti-surface border-ubiquiti-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-ubiquiti-elevated rounded-lg flex items-center justify-center">
                        <Wifi className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{camera.name}</h3>
                        <p className="text-gray-400">{camera.ipAddress}:{camera.port}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                          <span>{camera.resolution}</span>
                          <span>{camera.fps} FPS</span>
                          <span>{camera.codec}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge 
                          className={
                            camera.status === "online" 
                              ? "bg-ubiquiti-blue bg-opacity-20 text-ubiquiti-blue"
                              : "bg-red-500 bg-opacity-20 text-red-500"
                          }
                        >
                          {camera.status}
                        </Badge>
                        {camera.isRecording && (
                          <Badge className="bg-red-500 bg-opacity-20 text-red-500 mt-1">
                            Recording
                          </Badge>
                        )}
                        {camera.aiDetectionEnabled && (
                          <Badge className="bg-yellow-500 bg-opacity-20 text-yellow-500 mt-1">
                            AI Enabled
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

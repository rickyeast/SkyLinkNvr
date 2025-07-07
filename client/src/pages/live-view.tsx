import { CameraGrid } from "@/components/camera/camera-grid";
import { Button } from "@/components/ui/button";
import { Grid3X3, Maximize2 } from "lucide-react";

export default function LiveView() {
  return (
    <>
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Live View</h2>
            <p className="text-gray-400">Real-time monitoring of all cameras</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grid Layout
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4 mr-2" />
              Full Screen
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        <CameraGrid />
      </div>
    </>
  );
}

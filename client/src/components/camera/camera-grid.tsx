import { useCameras } from "@/hooks/use-cameras";
import { CameraFeed } from "./camera-feed";
import { Skeleton } from "@/components/ui/skeleton";

export function CameraGrid() {
  const { data: cameras, isLoading } = useCameras();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-ubiquiti-surface border border-ubiquiti-border rounded-xl overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!cameras || cameras.length === 0) {
    return (
      <div className="bg-ubiquiti-surface border border-ubiquiti-border rounded-xl p-12 text-center">
        <p className="text-gray-400 text-lg">No cameras configured</p>
        <p className="text-gray-500 text-sm mt-2">Add cameras to start monitoring</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {cameras.map((camera) => (
        <CameraFeed key={camera.id} camera={camera} />
      ))}
    </div>
  );
}

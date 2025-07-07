import { StatsCards } from "@/components/dashboard/stats-cards";
import { CameraGrid } from "@/components/camera/camera-grid";
import { RecentDetections } from "@/components/dashboard/recent-detections";
import { SystemHealth } from "@/components/dashboard/system-health";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Dashboard() {
  return (
    <>
      {/* Header */}
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">System Dashboard</h2>
            <p className="text-gray-400">Monitor and manage your security camera system</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-ubiquiti-elevated px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-300">System Online</span>
            </div>
            <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
              <Plus className="w-4 h-4 mr-2" />
              Add Camera
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 overflow-y-auto h-full">
        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards />
        </div>

        {/* Camera Grid */}
        <div className="mb-8">
          <CameraGrid />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentDetections />
          <SystemHealth />
        </div>
      </div>
    </>
  );
}

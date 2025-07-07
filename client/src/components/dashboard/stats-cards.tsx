import { Card, CardContent } from "@/components/ui/card";
import { Video, Circle, HardDrive, Brain } from "lucide-react";
import { useSystemStats } from "@/hooks/use-system-stats";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsCards() {
  const { data: stats, isLoading } = useSystemStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Active Cameras",
      value: stats?.activeCameras || 0,
      icon: Video,
      color: "bg-ubiquiti-blue bg-opacity-20 text-ubiquiti-blue",
    },
    {
      title: "Recording",
      value: stats?.recordingCameras || 0,
      icon: Circle,
      color: "bg-red-500 bg-opacity-20 text-red-500",
    },
    {
      title: "Storage Used",
      value: stats?.storageUsed || "0 TB",
      icon: HardDrive,
      color: "bg-yellow-500 bg-opacity-20 text-yellow-500",
    },
    {
      title: "AI Detections",
      value: stats?.aiDetections || 0,
      icon: Brain,
      color: "bg-green-500 bg-opacity-20 text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{card.title}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

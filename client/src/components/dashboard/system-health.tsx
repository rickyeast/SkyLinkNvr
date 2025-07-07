import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export function SystemHealth() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["/api/system/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="bg-ubiquiti-surface border-ubiquiti-border">
        <CardHeader>
          <CardTitle className="text-white">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const cpuUsage = health ? parseFloat(health.cpuUsage) : 0;
  const memoryUsage = health ? parseFloat(health.memoryUsage) : 0;
  const storageUsage = health ? parseFloat(health.storageUsage) : 0;

  const getProgressColor = (value: number) => {
    if (value > 80) return "bg-red-500";
    if (value > 60) return "bg-yellow-500";
    return "bg-ubiquiti-blue";
  };

  return (
    <Card className="bg-ubiquiti-surface border-ubiquiti-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">System Health</CardTitle>
          <Button variant="link" className="text-ubiquiti-blue hover:text-ubiquiti-blue-dark">
            Details
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">CPU Usage</span>
              <span className="text-white text-sm">{Math.round(cpuUsage)}%</span>
            </div>
            <Progress 
              value={cpuUsage} 
              className="h-2"
              indicatorClassName={getProgressColor(cpuUsage)}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Memory Usage</span>
              <span className="text-white text-sm">{Math.round(memoryUsage)}%</span>
            </div>
            <Progress 
              value={memoryUsage} 
              className="h-2"
              indicatorClassName={getProgressColor(memoryUsage)}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Storage Usage</span>
              <span className="text-white text-sm">{Math.round(storageUsage)}%</span>
            </div>
            <Progress 
              value={storageUsage} 
              className="h-2"
              indicatorClassName={getProgressColor(storageUsage)}
            />
          </div>
          
          <div className="pt-4 border-t border-ubiquiti-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Network In</p>
                <p className="text-white font-medium">
                  {health?.networkIn ? `${Math.round(health.networkIn / 1024 / 1024)} MB/s` : "0 MB/s"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Network Out</p>
                <p className="text-white font-medium">
                  {health?.networkOut ? `${Math.round(health.networkOut / 1024 / 1024)} MB/s` : "0 MB/s"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

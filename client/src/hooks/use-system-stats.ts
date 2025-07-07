import { useQuery } from "@tanstack/react-query";

interface SystemStats {
  activeCameras: number;
  recordingCameras: number;
  totalCameras: number;
  storageUsed: string;
  aiDetections: number;
  systemHealth: any;
}

export function useSystemStats() {
  return useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

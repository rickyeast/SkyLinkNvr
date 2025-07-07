import { useQuery } from "@tanstack/react-query";
import { Camera } from "@shared/schema";

export function useCameras() {
  return useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
    refetchInterval: 30000, // Refresh every 30 seconds for status updates
  });
}

export function useCamera(id: number) {
  return useQuery<Camera>({
    queryKey: ["/api/cameras", id],
    enabled: !!id,
  });
}

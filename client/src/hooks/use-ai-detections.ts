import { useQuery } from "@tanstack/react-query";
import { AiDetection } from "@shared/schema";

export function useAiDetections(limit: number = 10) {
  return useQuery<AiDetection[]>({
    queryKey: ["/api/detections", limit],
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
  });
}

export function useDetectionStats() {
  return useQuery({
    queryKey: ["/api/detections/stats"],
    refetchInterval: 60000, // Refresh every minute
  });
}

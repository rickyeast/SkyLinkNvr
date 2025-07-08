import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Download, 
  Calendar as CalendarIcon, 
  Filter, 
  Eye, 
  AlertTriangle,
  Clock,
  HardDrive,
  Video
} from "lucide-react";
import { format } from "date-fns";

interface Recording {
  id: number;
  cameraId: number;
  filename: string;
  filepath: string;
  startTime: string;
  endTime: string;
  duration: number;
  fileSize: number;
  quality: string;
  status: string;
  triggerType: string;
  motionEvents?: Array<{
    timestamp: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
}

interface MotionEvent {
  id: number;
  cameraId: number;
  recordingId: number;
  detectedAt: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  eventType: string;
  thumbnailPath?: string;
}

interface ClipViewerProps {
  cameraId?: number;
}

export function ClipViewer({ cameraId }: ClipViewerProps) {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [filterTriggerType, setFilterTriggerType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['/api/recordings', cameraId, filterTriggerType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (cameraId) params.append('cameraId', cameraId.toString());
      if (filterTriggerType !== 'all') params.append('triggerType', filterTriggerType);
      return apiRequest(`/api/recordings?${params}`);
    }
  });

  const { data: motionEvents } = useQuery({
    queryKey: ['/api/recording/motion-events', selectedRecording?.id],
    queryFn: () => apiRequest(`/api/recording/motion-events/recording/${selectedRecording?.id}`),
    enabled: !!selectedRecording
  });

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

  const filteredRecordings = recordings?.filter((recording: Recording) => {
    if (searchTerm && !recording.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterDate) {
      const recordingDate = new Date(recording.startTime);
      if (recordingDate.toDateString() !== filterDate.toDateString()) {
        return false;
      }
    }
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recording Library</h2>
          <p className="text-muted-foreground">
            {cameraId ? 'Camera recordings and clips' : 'All camera recordings'}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          {filteredRecordings.length} clips
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search recordings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterTriggerType} onValueChange={setFilterTriggerType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                <SelectItem value="motion">Motion</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="continuous">Continuous</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                />
                <div className="p-3 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setFilterDate(undefined)}
                  >
                    Clear Date Filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecordings.map((recording: Recording) => (
          <Card 
            key={recording.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRecording?.id === recording.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedRecording(recording)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base truncate">
                  {recording.filename}
                </CardTitle>
                <Badge className={getTriggerTypeColor(recording.triggerType)}>
                  {recording.triggerType}
                </Badge>
              </div>
              <CardDescription>
                {format(new Date(recording.startTime), "MMM d, yyyy 'at' h:mm a")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(recording.duration || 0)}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HardDrive className="h-3 w-3" />
                  {formatFileSize(recording.fileSize || 0)}
                </span>
              </div>
              
              {recording.motionEvents && recording.motionEvents.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-orange-500">
                  <AlertTriangle className="h-3 w-3" />
                  {recording.motionEvents.length} motion event(s)
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Play video logic here
                  }}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Play
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Download logic here
                    window.open(`/api/recordings/${recording.id}/download`);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecordings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recordings found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || filterDate || filterTriggerType !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Start recording to see clips here'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recording Details Panel */}
      {selectedRecording && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recording Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <p className="text-lg font-mono">{formatDuration(selectedRecording.duration || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">File Size</label>
                <p className="text-lg">{formatFileSize(selectedRecording.fileSize || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quality</label>
                <p className="text-lg capitalize">{selectedRecording.quality}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-lg capitalize">{selectedRecording.status}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Timeline</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Started:</span>
                  <span>{format(new Date(selectedRecording.startTime), "MMM d, yyyy 'at' h:mm:ss a")}</span>
                </div>
                {selectedRecording.endTime && (
                  <div className="flex justify-between text-sm">
                    <span>Ended:</span>
                    <span>{format(new Date(selectedRecording.endTime), "MMM d, yyyy 'at' h:mm:ss a")}</span>
                  </div>
                )}
              </div>
            </div>

            {motionEvents && motionEvents.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Motion Events ({motionEvents.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {motionEvents.map((event: MotionEvent) => (
                      <div key={event.id} className="flex items-center justify-between p-2 rounded border">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {event.eventType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(parseFloat(event.confidence.toString()) * 100)}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.detectedAt), "h:mm:ss a")}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
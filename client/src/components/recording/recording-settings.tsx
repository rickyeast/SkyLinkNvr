import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Settings, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecordingSettings {
  id: number;
  cameraId: number;
  continuousRecording: boolean;
  motionTriggered: boolean;
  scheduledRecording: boolean;
  motionSensitivity: number;
  preRecordSeconds: number;
  postRecordSeconds: number;
  maxClipDuration: number;
  retentionDays: number;
  schedule: Array<{
    day: string;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }>;
}

interface RecordingSettingsProps {
  cameraId: number;
  cameraName: string;
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export function RecordingSettings({ cameraId, cameraName }: RecordingSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/recording/config', cameraId],
    queryFn: () => apiRequest(`/api/recording/config/${cameraId}`)
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<RecordingSettings>) =>
      apiRequest(`/api/recording/config/${cameraId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedSettings)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recording/config', cameraId] });
      toast({
        title: "Settings updated",
        description: "Recording settings have been saved successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recording settings.",
        variant: "destructive"
      });
    }
  });

  const [scheduleEdit, setScheduleEdit] = useState<{
    day: string;
    startTime: string;
    endTime: string;
    enabled: boolean;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const handleSettingChange = (key: keyof RecordingSettings, value: any) => {
    const updatedSettings = { ...settings, [key]: value };
    updateSettingsMutation.mutate(updatedSettings);
  };

  const handleScheduleChange = (day: string, schedule: any) => {
    const existingSchedule = settings?.schedule || [];
    const updatedSchedule = existingSchedule.filter(s => s.day !== day);
    if (schedule.enabled) {
      updatedSchedule.push({ day, ...schedule });
    }
    handleSettingChange('schedule', updatedSchedule);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recording Settings</h2>
          <p className="text-muted-foreground">Configure recording behavior for {cameraName}</p>
        </div>
        <Badge variant={settings?.continuousRecording || settings?.motionTriggered || settings?.scheduledRecording ? "default" : "secondary"}>
          {settings?.continuousRecording || settings?.motionTriggered || settings?.scheduledRecording ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Recording Modes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Recording Modes
          </CardTitle>
          <CardDescription>
            Choose how and when recordings should be triggered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Continuous Recording */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="continuous">Continuous Recording</Label>
              <p className="text-sm text-muted-foreground">
                Record continuously 24/7
              </p>
            </div>
            <Switch
              id="continuous"
              checked={settings?.continuousRecording || false}
              onCheckedChange={(checked) => handleSettingChange('continuousRecording', checked)}
            />
          </div>

          <Separator />

          {/* Motion-Triggered Recording */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="motion">Motion-Triggered Recording</Label>
                <p className="text-sm text-muted-foreground">
                  Record when motion is detected using AI
                </p>
              </div>
              <Switch
                id="motion"
                checked={settings?.motionTriggered || false}
                onCheckedChange={(checked) => handleSettingChange('motionTriggered', checked)}
              />
            </div>

            {settings?.motionTriggered && (
              <div className="pl-6 space-y-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>Motion Sensitivity: {Math.round((settings.motionSensitivity || 0.5) * 100)}%</Label>
                  <Slider
                    value={[(settings.motionSensitivity || 0.5) * 100]}
                    onValueChange={([value]) => handleSettingChange('motionSensitivity', value / 100)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values require more obvious motion to trigger recording
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preRecord">Pre-record (seconds)</Label>
                    <Input
                      id="preRecord"
                      type="number"
                      value={settings.preRecordSeconds || 5}
                      onChange={(e) => handleSettingChange('preRecordSeconds', parseInt(e.target.value))}
                      min={0}
                      max={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postRecord">Post-record (seconds)</Label>
                    <Input
                      id="postRecord"
                      type="number"
                      value={settings.postRecordSeconds || 10}
                      onChange={(e) => handleSettingChange('postRecordSeconds', parseInt(e.target.value))}
                      min={0}
                      max={60}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Scheduled Recording */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="scheduled">Scheduled Recording</Label>
                <p className="text-sm text-muted-foreground">
                  Record during specific time periods
                </p>
              </div>
              <Switch
                id="scheduled"
                checked={settings?.scheduledRecording || false}
                onCheckedChange={(checked) => handleSettingChange('scheduledRecording', checked)}
              />
            </div>

            {settings?.scheduledRecording && (
              <div className="pl-6 space-y-4 border-l-2 border-muted">
                {DAYS_OF_WEEK.map(day => {
                  const daySchedule = settings.schedule?.find(s => s.day === day);
                  return (
                    <div key={day} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="font-medium capitalize">{day}</span>
                        {daySchedule?.enabled && (
                          <Badge variant="outline">
                            {formatTime(daySchedule.startTime)} - {formatTime(daySchedule.endTime)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={daySchedule?.enabled || false}
                          onCheckedChange={(enabled) => {
                            if (enabled && !daySchedule) {
                              setScheduleEdit({
                                day,
                                startTime: '09:00',
                                endTime: '17:00',
                                enabled: true
                              });
                            } else {
                              handleScheduleChange(day, { enabled });
                            }
                          }}
                        />
                        {daySchedule?.enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScheduleEdit(daySchedule)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure clip duration and retention settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDuration">Max Clip Duration (minutes)</Label>
              <Input
                id="maxDuration"
                type="number"
                value={Math.round((settings?.maxClipDuration || 300) / 60)}
                onChange={(e) => handleSettingChange('maxClipDuration', parseInt(e.target.value) * 60)}
                min={1}
                max={60}
              />
              <p className="text-xs text-muted-foreground">
                Maximum length for individual recording clips
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention">Retention (days)</Label>
              <Input
                id="retention"
                type="number"
                value={settings?.retentionDays || 30}
                onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))}
                min={1}
                max={365}
              />
              <p className="text-xs text-muted-foreground">
                How long to keep recordings before automatic deletion
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Edit Modal */}
      {scheduleEdit && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Edit Schedule - {scheduleEdit.day.charAt(0).toUpperCase() + scheduleEdit.day.slice(1)}</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={scheduleEdit.startTime}
                    onChange={(e) => setScheduleEdit({ ...scheduleEdit, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={scheduleEdit.endTime}
                    onChange={(e) => setScheduleEdit({ ...scheduleEdit, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setScheduleEdit(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleScheduleChange(scheduleEdit.day, scheduleEdit);
                    setScheduleEdit(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Server, Shield, Bell } from "lucide-react";

export default function Settings() {
  return (
    <>
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            <p className="text-gray-400">Configure system preferences and options</p>
          </div>
          <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* System Settings */}
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Server className="w-5 h-5 mr-2" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="system-name" className="text-gray-300">System Name</Label>
                  <Input 
                    id="system-name"
                    defaultValue="Skylink NVR System"
                    className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-gray-300">Admin Email</Label>
                  <Input 
                    id="admin-email"
                    type="email"
                    defaultValue="admin@skylink.local"
                    className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Auto Start Recording</Label>
                  <p className="text-sm text-gray-400">Automatically start recording on new cameras</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Motion Detection</Label>
                  <p className="text-sm text-gray-400">Enable motion-based recording triggers</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-400">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Session Timeout</Label>
                  <p className="text-sm text-gray-400">Auto logout after inactivity</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator className="bg-ubiquiti-border" />
              
              <div className="space-y-2">
                <Label htmlFor="session-duration" className="text-gray-300">Session Duration (minutes)</Label>
                <Input 
                  id="session-duration"
                  type="number"
                  defaultValue="60"
                  className="bg-ubiquiti-elevated border-ubiquiti-border text-white max-w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">AI Detection Alerts</Label>
                  <p className="text-sm text-gray-400">Get notified when AI detects objects</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Camera Offline Alerts</Label>
                  <p className="text-sm text-gray-400">Alert when cameras go offline</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Storage Warnings</Label>
                  <p className="text-sm text-gray-400">Alert when storage is running low</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator className="bg-ubiquiti-border" />
              
              <div className="space-y-2">
                <Label htmlFor="email-notifications" className="text-gray-300">Email Notifications</Label>
                <Input 
                  id="email-notifications"
                  type="email"
                  placeholder="alerts@company.com"
                  className="bg-ubiquiti-elevated border-ubiquiti-border text-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

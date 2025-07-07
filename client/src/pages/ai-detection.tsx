import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentDetections } from "@/components/dashboard/recent-detections";
import { Settings, Brain, TrendingUp } from "lucide-react";

export default function AiDetection() {
  return (
    <>
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">AI Detection</h2>
            <p className="text-gray-400">Monitor and configure AI-powered detection</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button className="bg-ubiquiti-blue hover:bg-ubiquiti-blue-dark">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-ubiquiti-blue" />
                Detection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-green-500 font-semibold">Active</p>
                <p className="text-gray-400 text-sm">3 cameras monitoring</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white">Today's Detections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-white">47</p>
                <p className="text-gray-400 text-sm">+12 from yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-ubiquiti-surface border-ubiquiti-border">
            <CardHeader>
              <CardTitle className="text-white">Most Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-xl font-bold text-white">Person</p>
                <p className="text-gray-400 text-sm">32 detections today</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <RecentDetections />
      </div>
    </>
  );
}

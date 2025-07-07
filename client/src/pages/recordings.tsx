import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Trash2, Calendar } from "lucide-react";

export default function Recordings() {
  return (
    <>
      <header className="bg-ubiquiti-surface border-b border-ubiquiti-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Recordings</h2>
            <p className="text-gray-400">Browse and manage recorded footage</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 overflow-y-auto h-full">
        <Card className="bg-ubiquiti-surface border-ubiquiti-border">
          <CardHeader>
            <CardTitle className="text-white">Recent Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No recordings available</p>
              <p className="text-gray-500 text-sm mt-2">
                Start recording from cameras to see footage here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import LiveView from "@/pages/live-view";
import Recordings from "@/pages/recordings";
import Cameras from "@/pages/cameras";
import AiDetection from "@/pages/ai-detection";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/live-view" component={LiveView} />
        <Route path="/recordings" component={Recordings} />
        <Route path="/cameras" component={Cameras} />
        <Route path="/ai-detection" component={AiDetection} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

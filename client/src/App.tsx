import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherSession from "@/pages/teacher/session";
import StudentJoin from "@/pages/student/join";
import StudentSession from "@/pages/student/session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/session/:sessionId" component={TeacherSession} />
      <Route path="/student/join" component={StudentJoin} />
      <Route path="/student/session/:sessionId" component={StudentSession} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

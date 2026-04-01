import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MonitorPlay, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />

      <div className="glass-panel p-10 md:p-16 rounded-3xl max-w-3xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4">
            <MonitorPlay size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Vi-Slides <span className="text-primary font-light">Lite</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto font-light">
            A focused, distraction-free classroom tool. Teachers command the session, students stay engaged.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
          <div className="glass p-6 rounded-2xl flex flex-col items-center space-y-4 text-center border-primary/20 hover:border-primary/50 transition-colors">
            <MonitorPlay size={32} className="text-primary" />
            <h2 className="text-xl font-medium text-white">For Teachers</h2>
            <p className="text-sm text-muted-foreground">Command your classroom, see live engagement, and answer questions effortlessly.</p>
            <Link href="/login?role=teacher" className="w-full mt-4 block">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Teacher Login
              </Button>
            </Link>
          </div>

          <div className="glass p-6 rounded-2xl flex flex-col items-center space-y-4 text-center border-white/10 hover:border-white/30 transition-colors">
            <Users size={32} className="text-white" />
            <h2 className="text-xl font-medium text-white">For Students</h2>
            <p className="text-sm text-muted-foreground">Join sessions, raise your hand, and ask questions without interrupting.</p>
            <Link href="/login?role=student" className="w-full mt-4 block">
              <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">`
                Student Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

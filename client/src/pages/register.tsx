import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@/lib/hooks";
import type { RegisterRequestRole } from "@/lib/hooks";
import { storeToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MonitorPlay, Users } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [role, setRole] = useState<RegisterRequestRole>("teacher");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roleParam = searchParams.get("role");
    if (roleParam === "teacher" || roleParam === "student") {
      setRole(roleParam);
    }
  }, []);

  const registerMutation = useRegister();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate({ data: { ...data, role } }, {
      onSuccess: (response) => {
        storeToken(response.token);
        toast({ title: "Account created", description: `Welcome to Vi-Slides, ${response.user.name}!` });
        setLocation(response.user.role === "teacher" ? "/teacher/dashboard" : "/student/join");
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Registration failed", description: error.message || "An error occurred." });
      },
    });
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary mb-6 hover:bg-primary/20 transition-colors cursor-pointer">
            <MonitorPlay size={32} strokeWidth={1.5} />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Create an account</h1>
          <p className="text-muted-foreground">Join Vi-Slides to get started</p>
        </div>

        <div className="glass p-8 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex p-1 bg-black/20 rounded-lg mb-8 border border-white/5">
            <button
              onClick={() => setRole("teacher")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${role === "teacher" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              <MonitorPlay size={16} /> Teacher
            </button>
            <button
              onClick={() => setRole("student")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${role === "student" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              <Users size={16} /> Student
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-white/80">Full Name</Label>
                    <FormControl>
                      <Input placeholder="John Doe" className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-white/80">Email</Label>
                    <FormControl>
                      <Input placeholder="you@example.com" type="email" className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-white/80">Password</Label>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className={`w-full mt-6 ${role === "teacher" ? "bg-primary hover:bg-primary/90" : "bg-white text-black hover:bg-white/90"}`}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            Already have an account?{" "}
            <Link href={`/login?role=${role}`} className="text-primary hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

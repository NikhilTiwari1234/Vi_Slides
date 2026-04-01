import { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useJoinSession } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2 } from "lucide-react";
import { useAuthGuard, logout } from "@/lib/auth";

const joinSchema = z.object({
  code: z.string().length(6, "Session code must be exactly 6 characters").toUpperCase(),
});

type JoinForm = z.infer<typeof joinSchema>;

export default function StudentJoin() {
  const { isReady } = useAuthGuard("student");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const joinMutation = useJoinSession();

  const form = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = (data: JoinForm) => {
    joinMutation.mutate({ data }, {
      onSuccess: (session) => {
        toast({ title: "Joined successfully!" });
        setLocation(`/student/session/${session.id}`);
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Could not join", description: error.message || "Invalid code or session is not active." });
      },
    });
  };

  if (!isReady) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] -z-10 pointer-events-none" />

      <div className="absolute top-6 right-6">
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-white">
          Logout
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-white/5 text-white mb-6 border border-white/10 shadow-xl">
            <Users size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join a Session</h1>
          <p className="text-muted-foreground">Enter the 6-digit code provided by your teacher</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-white/80 sr-only">Session Code</Label>
                    <FormControl>
                      <Input
                        placeholder="ENTER 6-DIGIT CODE"
                        className="bg-black/40 border-white/10 text-white placeholder:text-white/20 text-center text-2xl tracking-[0.5em] h-16 font-mono font-bold uppercase focus-visible:ring-primary focus-visible:border-primary"
                        maxLength={6}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive text-center" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 bg-white text-black hover:bg-white/90 text-lg font-semibold shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]"
                disabled={joinMutation.isPending || form.watch("code").length !== 6}
              >
                {joinMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Join Session"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

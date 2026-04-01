

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getStoredToken, clearToken } from "./api";

export function logout(): void {
  clearToken();
  window.location.href = "/login";
}

export function useAuthGuard(requiredRole?: "teacher" | "student"): {
  isReady: boolean;
  token: string | null;
} {
  const [isReady, setIsReady] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setLocation("/login");
      return;
    }

    try {
      const payloadBase64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadBase64));

      if (payload.exp && Date.now() / 1000 > payload.exp) {
        clearToken();
        setLocation("/login");
        return;
      }

      if (requiredRole && payload.role !== requiredRole) {
        
        setLocation(payload.role === "teacher" ? "/teacher/dashboard" : "/student/join");
        return;
      }

      setIsReady(true);
    } catch {
      
      clearToken();
      setLocation("/login");
    }
  }, [requiredRole, setLocation]);

  return { isReady, token: getStoredToken() };
}

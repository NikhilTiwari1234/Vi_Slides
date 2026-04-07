import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Port 3000 for the React frontend
  server: {
    port: 3000,
    host: true, // allow access from local network (e.g. phone, tablet)
    allowedHosts: true,

    // Proxy API and WebSocket requests to the Express backend
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true, // forward WebSocket upgrades
        changeOrigin: true,
      },
    },
  },

  // Support absolute imports like @/components/ui/button
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

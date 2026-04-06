

import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

let io: SocketServer | null = null;

const JWT_SECRET = process.env.JWT_SECRET || "vi-slides-secret-key-change-me";

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization;

    if (!token) return next(); // allow unauthenticated connections

    try {
      const str =
        typeof token === "string" && token.startsWith("Bearer ")
          ? token.split(" ")[1]
          : token;
      const decoded = jwt.verify(str, JWT_SECRET) as { userId: number; role: string };
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
    } catch {
      // Invalid token — allow connection without user context
    }
    next();
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("join-session", (sessionId: number) => {
      const room = `session:${sessionId}`;
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined room ${room}`);
    });

    socket.on("leave-session", (sessionId: number) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log("[Socket] Socket.io server initialized");
  return io;
}

export function getSocketServer(): SocketServer | null {
  return io;
}

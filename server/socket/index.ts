import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { usersTable } from "../models";
import { eq } from "drizzle-orm";

let io: SocketServer | null = null;

const JWT_SECRET =
  process.env.JWT_SECRET || "vi-slides-secret-key-change-me";

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization;

    if (!token) return next();

    try {
      const str =
        typeof token === "string" && token.startsWith("Bearer ")
          ? token.split(" ")[1]
          : token;

      const decoded = jwt.verify(str, JWT_SECRET) as {
        userId: number;
        role: string;
      };

      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
    } catch (err) {
      console.warn("[Socket] Invalid token");
    }

    next();
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("join-session", (sessionId: number) => {
      if (!sessionId) return;

      const room = `session:${sessionId}`;
      socket.join(room);

      console.log(`[Socket] ${socket.id} joined ${room}`);
    });

  
    socket.on("leave-session", (sessionId: number) => {
      if (!sessionId) return;

      socket.leave(`session:${sessionId}`);
    });

   
    socket.on("chat:send", async ({ sessionId, message }) => {
      try {
        
        if (!sessionId) return;
        if (!message || typeof message !== "string" || !message.trim()) return;

        const room = `session:${sessionId}`;
        const userId = socket.data.userId;

        let senderName = "User";

       
        if (userId) {
          const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId));

          if (user?.name) {
            senderName = user.name;
          }
        }

        
        const chatPayload = {
          message: message.trim(),
          userId: userId || null,
          senderName,
          senderRole: socket.data.role || "unknown", // 🔥 future use
          createdAt: new Date(),
        };

        
        io?.to(room).emit("chat:new", chatPayload);
      } catch (err) {
        console.error("[Socket] chat:send error:", err);
      }
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
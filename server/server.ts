

import "dotenv/config"; 

import { createServer } from "http";
import express from "express";
import cors from "cors";
import router from "./routes/index";
import { initSocketServer } from "./socket/index";

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const app = express();

app.use(cors({ origin: CLIENT_URL, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅  Server running  → http://localhost:${PORT}`);
  console.log(`📡  WebSocket ready → ws://localhost:${PORT}/socket.io`);
  console.log(`🔌  API base URL    → http://localhost:${PORT}/api`);
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌  Port ${PORT} is already in use. Change PORT in your .env file.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

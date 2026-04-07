import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { getStoredToken } from "@/lib/api";

interface Message {
  message: string;
  senderName: string;
  createdAt: string;
  userId?: number | null;
}

export default function ChatBox({ sessionId }: { sessionId: number }) {
  const { socket } = useSocket(sessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const getUserIdFromToken = () => {
    try {
      const token = getStoredToken();
      if (!token) return null;

      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId;
    } catch {
      return null;
    }
  };
  const currentUserId = getUserIdFromToken();

  //  Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("receive-message", handleReceive);

    return () => {
      socket.off("receive-message", handleReceive);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    socket.emit("send-message", {
      sessionId,
      message: input,
      senderName: "User",
    });

    setInput("");
  };

  return (
    <div className="flex flex-col h-[400px] bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/10 text-white font-semibold">
        Live Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, index) => {
          const isMine = msg.userId === currentUserId;

          return (
            <div
              key={index}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                  isMine ? "bg-primary text-black" : "bg-white/10 text-white"
                }`}
              >
                {!isMine && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {msg.senderName}
                  </div>
                )}
                <div>{msg.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1 text-right">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white outline-none"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90"
        >
          Send
        </button>
      </div>
    </div>
  );
}

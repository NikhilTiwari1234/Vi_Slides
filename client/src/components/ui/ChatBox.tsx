import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";

interface Message {
  id?: number;
  message: string;
  userId: number;
  createdAt: string;
  senderName?: string;
}

export default function ChatBox({ sessionId }: { sessionId: number }) {
  const { socket } = useSocket(); // ✅ FIXED
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/chat`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("vi-slides-token")}`,
      },
    })
      .then((res) => res.json())
      .then(setMessages);
  }, [sessionId]);

  
  useEffect(() => {
    if (!socket) return;

    socket.emit("join-session", sessionId);

    return () => {
      socket.emit("leave-session", sessionId);
    };
  }, [socket, sessionId]);

  
  useEffect(() => {
    if (!socket) return;

    socket.on("chat:new", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("chat:new");
    };
  }, [socket]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    await fetch(`/api/sessions/${sessionId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("vi-slides-token")}`,
      },
      body: JSON.stringify({ message: input }),
    });

   
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    socket?.emit("chat:send", {
      sessionId,
      message: input,
      userId: currentUser.id,
      senderName: currentUser.name,
    });

    setInput("");
  };

  return (
  <div className="border p-3 mt-4 rounded">
    <h3 className="font-bold mb-2">Live Chat</h3>

    <div className="h-48 overflow-y-auto border mb-2 p-3 rounded bg-black/20">
      {messages.map((m, i) => {
        const currentUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );
        const isMe = m.userId === currentUser?.id;

        return (
          <div
            key={i}
            className={`mb-2 flex ${
              isMe ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[75%] ${
                isMe
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {/* Sender Name */}
              <div className="text-xs font-semibold mb-1 opacity-70">
                {isMe ? "You" : m.senderName || "User"}
              </div>

              {/* Message */}
              <div className="text-sm">{m.message}</div>
            </div>
          </div>
        );
      })}
    </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="border w-full px-2 py-1 rounded"
        placeholder="Type a message..."
      />

      <button
        onClick={sendMessage}
        className="bg-green-500 text-white px-3 py-1 mt-2 rounded"
      >
        Send
      </button>
    </div>
  );
}
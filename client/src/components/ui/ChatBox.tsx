import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";

interface Message {
  id?: number;
  message: string;
  userId: number;
  createdAt: string;
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

   
    socket?.emit("chat:send", { sessionId, message: input });

    setInput("");
  };

  return (
    <div className="border p-3 mt-4 rounded">
      <h3 className="font-bold mb-2">Live Chat</h3>

      <div className="h-40 overflow-y-auto border mb-2 p-2 rounded">
        {messages.map((m, i) => (
          <div key={i} className="text-sm mb-1">
            {m.message}
          </div>
        ))}
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
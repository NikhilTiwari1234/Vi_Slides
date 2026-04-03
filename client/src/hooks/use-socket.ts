

import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSessionQueryKey,
  getGetParticipantsQueryKey,
  getGetQuestionsQueryKey,
  getGetEngagementSummaryQueryKey,
  getGetActivePollQueryKey,
  getGetPollsQueryKey,
} from "@/lib/hooks";
import { getStoredToken } from "@/lib/api";

let socketInstance: Socket | null = null;


export function useSocket(sessionId?: number) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    
    if (!socketInstance) {
      socketInstance = io({
        
        transports: ["websocket", "polling"],
        auth: {
          
          token: getStoredToken(),
        },
      });
    }

    const socket = socketInstance;

    

    function onConnect() {
      setIsConnected(true);
      
      socket.emit("join-session", sessionId);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    
    if (socket.connected) onConnect();

    

    socket.on("session:update", () => {
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: getGetParticipantsQueryKey(sessionId) });
    });

    socket.on("questions:new", () => {
      queryClient.invalidateQueries({ queryKey: getGetQuestionsQueryKey(sessionId) });
    });

    socket.on("engagement:update", () => {
      queryClient.invalidateQueries({
        queryKey: getGetEngagementSummaryQueryKey(sessionId),
      });
    });

    socket.on("hand:update", () => {
      queryClient.invalidateQueries({ queryKey: getGetParticipantsQueryKey(sessionId) });
      queryClient.invalidateQueries({
        queryKey: getGetEngagementSummaryQueryKey(sessionId),
      });
    });

socket.on("poll:new", () => {
  queryClient.invalidateQueries({ queryKey: getGetActivePollQueryKey(sessionId) });
  queryClient.invalidateQueries({ queryKey: getGetPollsQueryKey(sessionId) });
});

socket.on("poll:close", () => {
  queryClient.invalidateQueries({ queryKey: getGetActivePollQueryKey(sessionId) });
  queryClient.invalidateQueries({ queryKey: getGetPollsQueryKey(sessionId) });
});

socket.on("poll:response", () => {
  queryClient.invalidateQueries({ queryKey: getGetActivePollQueryKey(sessionId) });
});
    

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("session:update");
      socket.off("questions:new");
      socket.off("engagement:update");
      socket.off("hand:update");
      socket.off("poll:new");
      socket.off("poll:close");
      socket.off("poll:response");
    };
  }, [sessionId, queryClient]);

  return { isConnected, socket: socketInstance };
}

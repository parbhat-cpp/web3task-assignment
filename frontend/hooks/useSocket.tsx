"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

type SocketProviderProps = {
  children: React.ReactNode;
  config: {
    [key: string]: {
      url: string;
      options?: Parameters<typeof io>[1];
    };
  };
};

type SocketMap = {
  [key: string]: Socket;
};

const SocketContext = createContext<SocketMap | null>(null);

const SocketProvider = (props: SocketProviderProps) => {
  const [sockets, setSockets] = useState<SocketMap>({});

  useEffect(() => {
    const newSockets: SocketMap = {};

    try {
      Object.entries(props.config).forEach(([name, { url, options }]) => {
        const socket = io(url, {
          ...options,
          transports: ["websocket", "polling"],
          autoConnect: true,
        });
        newSockets[name] = socket;

        socket.on("connect", () => {
          console.log(name, "connected");
        });
        socket.on("disconnect", () => {
          console.log(name, "disconnected");
        });
        socket.on("connect_error", (error) => {
          console.error(`${name} connection failed`, error.message);
          toast.error(`Unable to connect to ${name} server`);
        });
      });

      setSockets(newSockets);
    } catch {
      toast.error("Failed to connect server");
    }

    return () => {
      Object.values(newSockets).forEach((socket) => socket.disconnect());
    };
  }, [JSON.stringify(props.config)]);

  const value = useMemo(() => sockets, [sockets]);

  return (
    <SocketContext.Provider value={value}>
      {props.children}
    </SocketContext.Provider>
  );
};

export const useSocket = (name: string): Socket | null => {
  const sockets = useContext(SocketContext);

  return sockets?.[name] ?? null;
};

export default SocketProvider;

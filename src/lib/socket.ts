import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
  if (typeof window === "undefined") return envUrl;
  if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    return window.location.origin;
  }
  return envUrl;
}

export function getSocket(): Socket {
  if (!socket) {
    const url = getSocketUrl();
    socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

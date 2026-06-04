import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = (import.meta.env.VITE_API_URL as string).replace('/api/v1', '');

export function initSocket(token: string): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

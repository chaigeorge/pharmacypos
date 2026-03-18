import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance = null;

export const useSocket = () => {
  const { token } = useAuthStore();

  const getSocket = useCallback(() => {
    if (!socketInstance && token) {
      socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => console.log('Socket connected:', socketInstance.id));
      socketInstance.on('disconnect', () => console.log('Socket disconnected'));
    }
    return socketInstance;
  }, [token]);

  useEffect(() => {
    return () => {
      // Don't disconnect on unmount — keep persistent socket
    };
  }, []);

  return { getSocket };
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

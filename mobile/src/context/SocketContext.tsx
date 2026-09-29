import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConnectionStatus, SocketContextType } from '../types';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();

  const [status, setStatus] = useState<ConnectionStatus>(
    socketService.getStatus()
  );

  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const reconnect = () => {
    if (token) {
      socketService.connect(token);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: null,
        status,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
};

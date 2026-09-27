import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthContextType } from '../types/index.js';
import { apiService } from '../services/api.service.js';
import { socketService } from '../services/socket.service.js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@meta_leads_jwt_token';
const USER_KEY = '@meta_leads_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          apiService.setToken(storedToken);
          setToken(storedToken);
          setUser(parsedUser);

          // Connect Socket.IO immediately
          socketService.connect(storedToken);
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      apiService.setToken(response.token);
      setToken(response.token);
      setUser(response.user);

      // Connect authenticated Socket.IO session
      socketService.connect(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.register(name, email, password);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      apiService.setToken(response.token);
      setToken(response.token);
      setUser(response.user);

      // Connect authenticated Socket.IO session
      socketService.connect(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Disconnect socket connection
      socketService.disconnect();

      // Clear server session & stored tokens
      await apiService.logout();
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      apiService.setToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

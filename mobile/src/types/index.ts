export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  externalMetaLeadId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  createdTime: string;
  source: string;
  createdAt: string;
  customFields?: Record<string, string>;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Leads: undefined;
};

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface SocketContextType {
  socket: any | null;
  status: ConnectionStatus;
  reconnect: () => void;
}


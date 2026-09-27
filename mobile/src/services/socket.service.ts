import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/env.js';
import { Lead, ConnectionStatus } from '../types/index.js';

class SocketService {
  private socket: Socket | null = null;
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private leadListeners: ((lead: Lead) => void)[] = [];
  private currentStatus: ConnectionStatus = 'disconnected';

  connect(token: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.updateStatus('connecting');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket?.id);
      this.updateStatus('connected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      this.updateStatus('error');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.updateStatus('disconnected');
    });

    this.socket.on('new_lead', (lead: Lead) => {
      console.log('[Socket] Realtime lead event received:', lead);
      this.leadListeners.forEach((fn) => fn(lead));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.updateStatus('disconnected');
    }
  }

  onStatusChange(fn: (status: ConnectionStatus) => void) {
    this.statusListeners.push(fn);
    fn(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== fn);
    };
  }

  onNewLead(fn: (lead: Lead) => void) {
    this.leadListeners.push(fn);
    return () => {
      this.leadListeners = this.leadListeners.filter((l) => l !== fn);
    };
  }

  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  private updateStatus(status: ConnectionStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }
}

export const socketService = new SocketService();

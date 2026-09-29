import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authService } from '../services/auth.service.js';
import { Lead, ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/index.js';
import { logger } from '../utils/logger.js';

type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

interface SocketRuntimeState {
  ioInstance: SocketServer | null;
  activeUserSockets: Map<string, Set<string>>;
}

const runtimeStateKey = Symbol.for('meta-leads-poc.socket-runtime');
const runtimeGlobal = globalThis as any;
const runtimeState = (runtimeGlobal[runtimeStateKey] ??= {
  ioInstance: null,
  activeUserSockets: new Map<string, Set<string>>(),
}) as SocketRuntimeState;

export const setupSocketIO = (
  httpServer: HttpServer
): SocketServer => {
  if (runtimeState.ioInstance) {
    return runtimeState.ioInstance;
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 15000,
    }
  );

  // Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.socket('warn', 'Rejected unauthenticated socket connection attempt (no token provided)');
        return next(new Error('Authentication error: Token is required to establish realtime connection.'));
      }

      const decoded = authService.verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (err: any) {
      logger.socket('warn', `Socket authentication failed: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    const userRoom = `user_${user.id}`;
    socket.join(userRoom);

    // Track active connection
    if (!runtimeState.activeUserSockets.has(user.id)) {
      runtimeState.activeUserSockets.set(user.id, new Set());
    }
    runtimeState.activeUserSockets.get(user.id)!.add(socket.id);

    logger.socket(
      'success',
      `Socket connected: ${user.name} (${user.email}) [Socket ID: ${socket.id}]. Joined room: [${userRoom}]`
    );

    // Send immediate acknowledgment
    socket.emit('lead_status', {
      message: `Realtime connected to room: ${userRoom}`,
      timestamp: new Date().toISOString(),
    });

    socket.on('disconnect', (reason) => {
      const userSockets = runtimeState.activeUserSockets.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          runtimeState.activeUserSockets.delete(user.id);
        }
      }
      logger.socket(
        'info',
        `Socket disconnected: ${user.name} [Socket ID: ${socket.id}]. Reason: ${reason}`
      );
    });

    socket.on('ping_server', () => {
      socket.emit('lead_status', {
        message: 'pong',
        timestamp: new Date().toISOString(),
      });
    });
  });

  runtimeState.ioInstance = io;
  return io;
};

/**
 * Emit a new lead strictly to the target user's private room.
 * Crucial: Does NOT broadcast globally to all users.
 */
export const emitLeadToUser = (userId: string, lead: Lead): boolean => {
  if (!runtimeState.ioInstance) {
    logger.socket('error', 'Cannot emit lead: Socket.IO server not initialized');
    return false;
  }

  const userRoom = `user_${userId}`;
  const connectedSockets = runtimeState.activeUserSockets.get(userId);
  const isOnline = connectedSockets && connectedSockets.size > 0;

  logger.socket(
    'info',
    `Emitting 'new_lead' event to room [${userRoom}]. (Target User active sessions: ${connectedSockets?.size || 0})`
  );

  runtimeState.ioInstance.to(userRoom).emit('new_lead', lead);

  return !!isOnline;
};

/**
 * Check if a user currently has an active Socket.IO connection
 */
export const isUserOnline = (userId: string): boolean => {
  const sockets = runtimeState.activeUserSockets.get(userId);
  return !!sockets && sockets.size > 0;
};

/**
 * Get count of currently online distinct users
 */
export const getOnlineUsersCount = (): number => {
  return runtimeState.activeUserSockets.size;
};

export const getActiveConnectionsInfo = (): Array<{ userId: string; socketCount: number }> => {
  const result: Array<{ userId: string; socketCount: number }> = [];
  runtimeState.activeUserSockets.forEach((sockets, userId) => {
    result.push({ userId, socketCount: sockets.size });
  });
  return result;
};

export const getIO = () => runtimeState.ioInstance;

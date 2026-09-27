/**
 * Clean logger utility for Meta Leads PoC
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'AUTH' | 'WEBHOOK' | 'GRAPH_API' | 'SOCKET' | 'DB' | 'SYSTEM';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

// In-memory ring buffer of recent logs for debugging and live visualization
const MAX_LOGS = 100;
const logHistory: LogEntry[] = [];
let logListeners: ((entry: LogEntry) => void)[] = [];

export const onLogEntry = (fn: (entry: LogEntry) => void) => {
  logListeners.push(fn);
  return () => {
    logListeners = logListeners.filter(l => l !== fn);
  };
};

export const getRecentLogs = (): LogEntry[] => [...logHistory];

export const clearLogs = () => {
  logHistory.length = 0;
};

const formatTime = () => new Date().toISOString();

const log = (
  category: LogEntry['category'],
  level: LogEntry['level'],
  message: string,
  data?: any
) => {
  const entry: LogEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: formatTime(),
    category,
    level,
    message,
    data,
  };

  logHistory.unshift(entry);
  if (logHistory.length > MAX_LOGS) {
    logHistory.pop();
  }

  // Notify active listeners
  logListeners.forEach(listener => {
    try {
      listener(entry);
    } catch {
      // Ignore listener error
    }
  });

  const prefix = `[${entry.timestamp}] [${category}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
};

export const logger = {
  auth: (level: LogEntry['level'], message: string, data?: any) => log('AUTH', level, message, data),
  webhook: (level: LogEntry['level'], message: string, data?: any) => log('WEBHOOK', level, message, data),
  graphApi: (level: LogEntry['level'], message: string, data?: any) => log('GRAPH_API', level, message, data),
  socket: (level: LogEntry['level'], message: string, data?: any) => log('SOCKET', level, message, data),
  db: (level: LogEntry['level'], message: string, data?: any) => log('DB', level, message, data),
  system: (level: LogEntry['level'], message: string, data?: any) => log('SYSTEM', level, message, data),
};

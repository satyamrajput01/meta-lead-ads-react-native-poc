import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'AUTH' | 'WEBHOOK' | 'GRAPH_API' | 'SOCKET' | 'DB' | 'SYSTEM';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

export const ServerLogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Initial fetch and SSE stream
  useEffect(() => {
    // Initial fetch
    fetch('/api/debug/logs')
      .then((r) => {
        const ct = r.headers.get('content-type');
        if (r.ok && ct && ct.includes('application/json')) {
          return r.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.logs) setLogs(data.logs);
      })
      .catch((err) => console.warn('Waiting for server logs...', err));

    // Connect to SSE stream
    const eventSource = new EventSource('/api/debug/logs/stream');
    eventSource.onmessage = (event) => {
      try {
        const newLog = JSON.parse(event.data);
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const clearLogs = async () => {
    await fetch('/api/debug/logs/clear', { method: 'POST' });
    setLogs([]);
  };

  const filteredLogs = categoryFilter === 'ALL'
    ? logs
    : logs.filter((l) => l.category === categoryFilter);

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <span className="text-live bg-highlight border border-line px-1.5 py-0.5 rounded text-[9px] font-semibold">OK</span>;
      case 'error':
        return <span className="text-danger bg-[#fdf1ef] border border-[#f0d2cd] px-1.5 py-0.5 rounded text-[9px] font-semibold">ERR</span>;
      case 'warn':
        return <span className="text-[#9a6a12] bg-[#fdf6e7] border border-[#f0e2c2] px-1.5 py-0.5 rounded text-[9px] font-semibold">WARN</span>;
      default:
        return <span className="text-brand bg-highlight border border-line px-1.5 py-0.5 rounded text-[9px] font-semibold">INFO</span>;
    }
  };

  const getCategoryColor = (cat: LogEntry['category']) => {
    switch (cat) {
      case 'WEBHOOK':
        return 'text-brand';
      case 'GRAPH_API':
        return 'text-[#6b4fb8]';
      case 'SOCKET':
        return 'text-live';
      case 'AUTH':
        return 'text-brand';
      case 'DB':
        return 'text-[#9a6a12]';
      default:
        return 'text-muted';
    }
  };

  return (
    <div className="bg-surface rounded-card border border-line shadow-[var(--shadow-card)] overflow-hidden flex flex-col h-full text-xs">
      {/* Log Header & Toolbar */}
      <div className="bg-surface px-4 py-3 border-b border-line flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand" />
          <span className="font-semibold text-ink text-xs">Live backend console &amp; webhook trace</span>
          <span className="relative flex w-2 h-2 ml-1">
            <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-ping"></span>
            <span className="relative inline-flex rounded-full w-2 h-2 bg-live"></span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center bg-canvas rounded-control p-0.5 border border-line text-[10px]">
            {['ALL', 'WEBHOOK', 'GRAPH_API', 'SOCKET', 'AUTH', 'DB'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  categoryFilter === cat ? 'bg-brand text-white font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={clearLogs}
            title="Clear logs"
            className="p-2 rounded-control bg-canvas hover:bg-highlight border border-line text-muted hover:text-brand transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Viewport */}
      <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 select-text font-mono text-[11px] leading-relaxed bg-canvas">
        {filteredLogs.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted font-sans">
            <span>No log entries recorded for category {categoryFilter}. Trigger an action or webhook.</span>
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="bg-surface border border-line rounded-control px-2.5 py-2 hover:border-brand/40 transition-colors">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-muted text-[10px] shrink-0">
                  {entry.timestamp.split('T')[1]?.slice(0, 8)}
                </span>
                {getLevelBadge(entry.level)}
                <span className={`font-semibold shrink-0 text-[10px] ${getCategoryColor(entry.category)}`}>
                  [{entry.category}]
                </span>
                <span className="text-ink flex-1 min-w-0">{entry.message}</span>
              </div>

              {entry.data && (
                <pre className="mt-1.5 p-2 rounded-md bg-canvas text-muted text-[10px] overflow-x-auto border border-line">
                  {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

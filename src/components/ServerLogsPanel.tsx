import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Filter, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';

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
        return <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1 rounded text-[9px]">OK</span>;
      case 'error':
        return <span className="text-red-400 bg-red-950/80 border border-red-800/80 px-1 rounded text-[9px]">ERR</span>;
      case 'warn':
        return <span className="text-amber-400 bg-amber-950/80 border border-amber-800/80 px-1 rounded text-[9px]">WARN</span>;
      default:
        return <span className="text-blue-400 bg-blue-950/80 border border-blue-800/80 px-1 rounded text-[9px]">INFO</span>;
    }
  };

  const getCategoryColor = (cat: LogEntry['category']) => {
    switch (cat) {
      case 'WEBHOOK':
        return 'text-indigo-400';
      case 'GRAPH_API':
        return 'text-purple-400';
      case 'SOCKET':
        return 'text-emerald-400';
      case 'AUTH':
        return 'text-blue-400';
      case 'DB':
        return 'text-amber-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full font-mono text-xs">
      {/* Log Header & Toolbar */}
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 text-xs tracking-wide">Live Backend Console & Webhook Trace</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1"></span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px]">
            {['ALL', 'WEBHOOK', 'GRAPH_API', 'SOCKET', 'AUTH', 'DB'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded transition ${
                  categoryFilter === cat ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={clearLogs}
            title="Clear logs"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Viewport */}
      <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 select-text text-slate-300 text-[11px] leading-relaxed">
        {filteredLogs.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-600">
            <span>No log entries recorded for category {categoryFilter}. Trigger an action or webhook.</span>
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="border-b border-slate-900 pb-1.5 hover:bg-slate-900/40 px-1 rounded">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500 text-[10px] shrink-0">
                  {entry.timestamp.split('T')[1]?.slice(0, 8)}
                </span>
                {getLevelBadge(entry.level)}
                <span className={`font-bold shrink-0 text-[10px] ${getCategoryColor(entry.category)}`}>
                  [{entry.category}]
                </span>
                <span className="text-slate-200 flex-1">{entry.message}</span>
              </div>

              {entry.data && (
                <pre className="mt-1 ml-16 p-2 rounded bg-slate-900/90 text-slate-400 text-[10px] overflow-x-auto border border-slate-800/80">
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

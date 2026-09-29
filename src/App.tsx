import React, { useState, useEffect } from 'react';
import {
  Radio,
  Server,
  Smartphone,
  Database,
  Webhook,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Code,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ServerLogsPanel } from './components/ServerLogsPanel.js';

interface Lead {
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
}

interface ServerStatus {
  success: boolean;
  meta: {
    verifyToken: string;
    webhookPath: string;
    hasAccessToken: boolean;
    pageId: string;
  };
  stats: {
    totalLeads: number;
    totalUsers: number;
    activeSocketConnections: number;
  };
  activeConnections: Array<{ userId: string; socketCount: number }>;
  recentLeads: Lead[];
  users: Array<{ id: string; name: string; email: string }>;
}

type TabId = 'stream' | 'leads' | 'meta_guide' | 'mobile_guide' | 'dev_test';

export default function App() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('stream');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Dev test endpoint state (clearly isolated for dev testing)
  const [devLeadName, setDevLeadName] = useState('Satyam Rajput');
  const [devLeadEmail, setDevLeadEmail] = useState('satyam@gmail.com');
  const [devLeadPhone, setDevLeadPhone] = useState('+91 98765 43210');
  const [devLeadCompany, setDevLeadCompany] = useState('ABC Technologies');
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devResult, setDevResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      // Avoid noisy console errors if server is initializing
      console.warn('Waiting for server status...', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const webhookUrl = `${window.location.origin}/api/webhooks/meta`;
  const verifyToken = status?.meta.verifyToken || 'meta_lead_ads_poc_verify_secret_token_123';

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const testHandshake = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const challengeStr = 'meta_test_' + Date.now();
      const res = await fetch(`/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challengeStr}`);
      const text = await res.text();
      if (res.ok && text === challengeStr) {
        setVerifyResult('Handshake 200 OK: hub.challenge echoed successfully.');
      } else {
        setVerifyResult(`Handshake error: HTTP ${res.status}: ${text}`);
      }
    } catch (err: any) {
      setVerifyResult(`Failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Developer curl simulation (isolated)
  const handleDevWebhookTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevSubmitting(true);
    setDevResult(null);
    try {
      const res = await fetch('/api/webhooks/meta/test-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: status?.meta.pageId || '109823478912345',
          formId: '49203940293402',
          name: devLeadName,
          email: devLeadEmail,
          phone: devLeadPhone,
          company: devLeadCompany,
        }),
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          setDevResult(`Success: Lead processed and emitted to active mobile socket! (Delivered: ${data.deliveredToActiveSocket ? 'Yes' : 'No - socket offline'})`);
          fetchStatus();
        } else {
          setDevResult(`Failed: ${data.error || 'Server error'}`);
        }
      } else {
        const text = await res.text();
        setDevResult(`Server returned non-JSON response (${res.status}): ${text.slice(0, 100)}`);
      }
    } catch (err: any) {
      setDevResult(`Error: ${err.message}`);
    } finally {
      setDevSubmitting(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString();
    } catch {
      return ts || 'Just now';
    }
  };

  const activeSockets = status?.stats.activeSocketConnections || 0;
  const mobileOnline = activeSockets > 0;

  const navItems: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'stream', label: 'Live Stream', icon: <Terminal className="w-[18px] h-[18px]" /> },
    { id: 'leads', label: 'Stored Leads', icon: <Database className="w-[18px] h-[18px]" />, badge: String(status?.stats.totalLeads || 0) },
    { id: 'mobile_guide', label: 'Mobile App', icon: <Smartphone className="w-[18px] h-[18px]" /> },
    { id: 'meta_guide', label: 'Webhook Setup', icon: <Webhook className="w-[18px] h-[18px]" /> },
    { id: 'dev_test', label: 'Developer Tools', icon: <Code className="w-[18px] h-[18px]" /> },
  ];

  const tabMeta: Record<TabId, { title: string; subtitle: string }> = {
    stream: { title: 'Live Stream', subtitle: 'Realtime webhook ingestion and Socket.IO dispatch trace' },
    leads: { title: 'Stored Leads', subtitle: 'Leads ingested from Meta webhooks and routed to user accounts' },
    mobile_guide: { title: 'Mobile App', subtitle: 'Run and connect the React Native client' },
    meta_guide: { title: 'Webhook Setup', subtitle: 'Configure the Meta Developer Portal and expose your backend' },
    dev_test: { title: 'Developer Tools', subtitle: 'Simulate a normalized Meta lead webhook locally' },
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex font-sans selection:bg-brand selection:text-white">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-16 md:w-64 shrink-0 bg-surface border-r border-line flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-3 md:px-5 border-b border-line">
          <div className="w-9 h-9 rounded-[10px] bg-brand text-white flex items-center justify-center font-bold text-lg shrink-0">
            ∞
          </div>
          <div className="hidden md:block min-w-0">
            <div className="text-sm font-semibold text-ink truncate">Meta Lead Ads</div>
            <div className="text-xs text-muted truncate">Realtime Console</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 md:px-3 py-4 space-y-1">
          <div className="hidden md:block px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Workspace
          </div>
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 px-2.5 md:px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                  active
                    ? 'bg-highlight text-brand'
                    : 'text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                <span className={active ? 'text-brand' : 'text-muted'}>{item.icon}</span>
                <span className="hidden md:inline flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span
                    className={`hidden md:inline-flex items-center justify-center min-w-6 px-1.5 h-5 rounded-full text-[11px] font-semibold ${
                      active ? 'bg-brand text-white' : 'bg-canvas text-muted border border-line'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System status area */}
        <div className="border-t border-line p-2 md:p-3 space-y-2">
          <div className="flex items-center gap-3 px-1.5 md:px-2 py-2 rounded-[10px]">
            <span className="relative flex w-2.5 h-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-ping"></span>
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-live"></span>
            </span>
            <div className="hidden md:block min-w-0">
              <div className="text-xs font-semibold text-ink">Server active</div>
              <div className="text-[11px] text-muted">Port 3000</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-1.5 md:px-2 py-2 rounded-[10px]">
            <Radio className={`w-[18px] h-[18px] shrink-0 ${mobileOnline ? 'text-live' : 'text-muted'}`} />
            <div className="hidden md:block min-w-0">
              <div className="text-xs font-semibold text-ink">
                {activeSockets} Mobile {activeSockets === 1 ? 'session' : 'sessions'}
              </div>
              <div className={`text-[11px] ${mobileOnline ? 'text-live' : 'text-muted'}`}>
                {mobileOnline ? 'Connected' : 'Waiting for app'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold text-ink truncate">{tabMeta[activeTab].title}</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-live bg-highlight px-2 py-0.5 rounded-full border border-line">
                  <span className="w-1.5 h-1.5 rounded-full bg-live"></span>
                  Server active
                </span>
              </div>
              <p className="text-xs text-muted truncate">{tabMeta[activeTab].subtitle}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-canvas border border-line text-muted text-xs">
                <Server className="w-3.5 h-3.5" />
                <span>Port 3000</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-canvas border border-line text-xs">
                <Radio className={`w-3.5 h-3.5 ${mobileOnline ? 'text-live' : 'text-muted'}`} />
                <span className="text-ink font-medium">{activeSockets}</span>
                <span className="text-muted">{activeSockets === 1 ? 'session' : 'sessions'}</span>
              </div>
              <button
                onClick={fetchStatus}
                title="Refresh status"
                className="p-2 rounded-[10px] bg-canvas hover:bg-highlight border border-line text-muted hover:text-brand transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6">
          {/* Metric Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Smartphone className="w-5 h-5" />}
              label="Connected mobile apps"
              value={String(activeSockets)}
              hint={mobileOnline ? 'Live Socket.IO' : 'Waiting for app'}
              hintTone={mobileOnline ? 'live' : 'muted'}
            />
            <MetricCard
              icon={<Database className="w-5 h-5" />}
              label="Total leads ingested"
              value={String(status?.stats.totalLeads || 0)}
              hint="in SQLite"
            />
            <MetricCard
              icon={<ShieldCheck className="w-5 h-5" />}
              label="Registered CRM agents"
              value={String(status?.stats.totalUsers || 0)}
              hint="Accounts"
            />
            <div className="p-4 rounded-card bg-surface border border-line shadow-[var(--shadow-card)] flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-highlight text-brand flex items-center justify-center shrink-0">
                <Webhook className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted">Meta webhook endpoint</div>
                <div className="text-sm font-semibold text-live flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </div>
                <div className="text-[11px] text-muted font-mono mt-0.5 truncate">/api/webhooks/meta</div>
              </div>
            </div>
          </div>

          {/* Webhook Configuration Card */}
          <div className="rounded-card bg-surface border border-line shadow-[var(--shadow-card)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-semibold text-ink">Webhook configuration</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConfigField
                label="Meta webhook URL"
                value={webhookUrl}
                copied={copiedUrl}
                onCopy={() => copyToClipboard(webhookUrl, true)}
                valueClassName="text-brand"
              />
              <ConfigField
                label="Verify token"
                value={verifyToken}
                copied={copiedToken}
                onCopy={() => copyToClipboard(verifyToken, false)}
                valueClassName="text-live"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={testHandshake}
                disabled={isVerifying}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-3.5 py-2 rounded-control text-sm transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying…' : 'Test GET handshake'}</span>
              </button>
              <span className="text-xs text-muted">Meta sends a GET request to verify the callback URL.</span>
            </div>

            {verifyResult && (
              <div
                className={`p-3 rounded-control text-xs font-mono border ${
                  verifyResult.includes('200 OK')
                    ? 'bg-highlight border-line text-live'
                    : 'bg-[#fdf1ef] border-[#f0d2cd] text-danger'
                }`}
              >
                {verifyResult}
              </div>
            )}
          </div>

          {/* Tab content */}
          {activeTab === 'stream' && (
            <div className="h-[560px]">
              <ServerLogsPanel />
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="rounded-card bg-surface border border-line shadow-[var(--shadow-card)] overflow-hidden">
              <div className="flex flex-wrap justify-between items-center gap-3 p-5 border-b border-line">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Stored leads</h3>
                  <p className="text-xs text-muted">Leads ingested from Meta webhooks and routed to user accounts</p>
                </div>
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-canvas hover:bg-highlight text-ink hover:text-brand rounded-control text-xs font-medium border border-line transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh table</span>
                </button>
              </div>

              {!status?.recentLeads || status.recentLeads.length === 0 ? (
                <div className="m-5 p-12 text-center border border-dashed border-line rounded-card text-muted text-xs">
                  No leads recorded yet. Submit a test lead through Meta&apos;s Lead Testing Tool or the Developer Tools.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas text-muted uppercase text-[10px] tracking-wider border-b border-line">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Phone</th>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">Received</th>
                        <th className="px-4 py-3 font-semibold">Meta leadgen ID</th>
                        <th className="px-4 py-3 font-semibold">Assigned user</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {status.recentLeads.map((lead) => {
                        const user = status.users.find((u) => u.id === lead.userId);
                        return (
                          <tr key={lead.id} className="hover:bg-highlight/60 transition-colors">
                            <td className="px-4 py-3 font-semibold text-ink">{lead.name}</td>
                            <td className="px-4 py-3 text-muted">{lead.email}</td>
                            <td className="px-4 py-3 text-muted">{lead.phone}</td>
                            <td className="px-4 py-3 text-brand font-medium">{lead.company || '—'}</td>
                            <td className="px-4 py-3 text-muted">{formatTimestamp(lead.createdTime || lead.createdAt)}</td>
                            <td className="px-4 py-3 text-muted font-mono">{lead.externalMetaLeadId}</td>
                            <td className="px-4 py-3 text-ink">{user?.name || lead.userId}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mobile_guide' && (
            <div className="rounded-card bg-surface border border-line shadow-[var(--shadow-card)] p-6 space-y-6 text-xs text-muted">
              <div>
                <h3 className="text-base font-semibold text-ink mb-1 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-brand" />
                  <span>Running the React Native app (mobile/)</span>
                </h3>
                <p>
                  The mobile app is located in the <code className="text-brand font-mono">mobile/</code> directory and is ready to run on an Android emulator or a physical phone.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-canvas border border-line rounded-card space-y-3">
                  <h4 className="font-semibold text-ink text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Option A: Android emulator</span>
                  </h4>
                  <p className="text-[11px]">
                    The Android emulator maps <code className="text-brand">localhost:3000</code> to <code className="text-live">10.0.2.2:3000</code>, configured in <code className="text-ink font-mono">mobile/src/config/env.ts</code>.
                  </p>
                  <pre className="p-3 rounded-control bg-ink text-slate-100 font-mono text-[11px] overflow-x-auto">
{`cd mobile
npm install
npm run android`}
                  </pre>
                </div>

                <div className="p-4 bg-canvas border border-line rounded-card space-y-3">
                  <h4 className="font-semibold text-ink text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-live text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Option B: Physical phone (Expo Go)</span>
                  </h4>
                  <p className="text-[11px]">
                    Open <code className="text-ink font-mono">mobile/src/config/env.ts</code> and set <code className="text-brand">DEV_LAN_OR_NGROK_URL</code> to your computer&apos;s local Wi-Fi IP (e.g. <code className="text-live">http://192.168.1.100:3000</code>) or your public ngrok URL.
                  </p>
                  <pre className="p-3 rounded-control bg-ink text-slate-100 font-mono text-[11px] overflow-x-auto">
{`cd mobile
npx expo start
# Scan the QR code using Expo Go app on your phone`}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-canvas border border-line rounded-card space-y-2">
                <h4 className="font-semibold text-ink text-xs">Mobile app behavior on Android:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
                  <li>User logs into the mobile app (or registers a new user).</li>
                  <li>App automatically opens the <strong className="text-ink font-semibold">Leads</strong> screen.</li>
                  <li>Green indicator confirms <strong className="text-ink font-semibold">Realtime Connected</strong> via Socket.IO.</li>
                  <li>Leave the phone sitting untouched on your desk.</li>
                  <li>Submit a lead from Meta&apos;s Lead Testing Tool.</li>
                  <li>The lead appears instantly on the phone screen with <strong className="text-ink font-semibold">zero refresh</strong>, no pull-to-refresh, and no user touch.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'meta_guide' && (
            <div className="rounded-card bg-surface border border-line shadow-[var(--shadow-card)] p-6 space-y-6 text-xs text-muted">
              <div>
                <h3 className="text-base font-semibold text-ink mb-1 flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-brand" />
                  <span>Meta Developer Portal &amp; webhook setup</span>
                </h3>
                <p>How to configure the real Meta Lead Testing Tool to send live webhooks to your backend.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-canvas border border-line rounded-card space-y-2">
                  <h4 className="font-semibold text-ink text-xs">Step 1: Expose backend via ngrok (local tunnel)</h4>
                  <p className="text-[11px]">Meta requires an HTTPS callback URL. Run ngrok in a separate terminal:</p>
                  <pre className="p-2.5 rounded-control bg-ink text-slate-100 font-mono text-[11px]">ngrok http 3000</pre>
                  <p className="text-[11px]">
                    Copy the HTTPS forwarding address, e.g. <code className="text-brand">https://xyz.ngrok-free.app</code>.
                  </p>
                </div>

                <div className="p-4 bg-canvas border border-line rounded-card space-y-2">
                  <h4 className="font-semibold text-ink text-xs">Step 2: Configure Meta Developer webhook</h4>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-brand underline">developers.facebook.com</a> &rarr; Your App &rarr; <strong className="text-ink font-semibold">Webhooks</strong>.</li>
                    <li>Select <strong className="text-ink font-semibold">Page</strong> from the dropdown and click <strong className="text-ink font-semibold">Subscribe to this object</strong>.</li>
                    <li>Enter Callback URL: <code className="text-brand bg-surface border border-line px-1.5 py-0.5 rounded">https://&lt;your-ngrok-url&gt;/api/webhooks/meta</code></li>
                    <li>Enter Verify Token: <code className="text-live bg-surface border border-line px-1.5 py-0.5 rounded">{verifyToken}</code></li>
                    <li>Click <strong className="text-ink font-semibold">Verify and Save</strong>. (Meta tests GET /api/webhooks/meta.)</li>
                    <li>In the Page webhooks list, locate <code className="text-ink font-semibold">leadgen</code> and click <strong className="text-ink font-semibold">Subscribe</strong>.</li>
                  </ol>
                </div>

                <div className="p-4 bg-canvas border border-line rounded-card space-y-2">
                  <h4 className="font-semibold text-ink text-xs">Step 3: Open Meta&apos;s official Lead Testing Tool</h4>
                  <p className="text-[11px]">
                    Visit the <a href="https://developers.facebook.com/tools/lead-ads-testing" target="_blank" rel="noreferrer" className="text-brand underline">Meta Lead Ads Testing Tool</a>, select your Page and Form, enter your details, and click <strong className="text-ink font-semibold">Create Lead</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dev_test' && (
            <div className="rounded-card bg-surface border border-line shadow-[var(--shadow-card)] p-6 space-y-5 text-xs text-muted">
              <div className="p-3 bg-highlight border border-line rounded-control text-ink text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Developer utility endpoint:</strong> This section is strictly for local testing without needing an active Meta Developer account. It sends the exact same normalized webhook structure as Meta&apos;s Lead Testing Tool.
                </div>
              </div>

              <form onSubmit={handleDevWebhookTest} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink mb-1 font-medium">Lead full name</label>
                    <input
                      type="text"
                      value={devLeadName}
                      onChange={(e) => setDevLeadName(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-control text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-ink mb-1 font-medium">Email</label>
                    <input
                      type="email"
                      value={devLeadEmail}
                      onChange={(e) => setDevLeadEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-control text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-ink mb-1 font-medium">Phone</label>
                    <input
                      type="text"
                      value={devLeadPhone}
                      onChange={(e) => setDevLeadPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-control text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-ink mb-1 font-medium">Company</label>
                    <input
                      type="text"
                      value={devLeadCompany}
                      onChange={(e) => setDevLeadCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-control text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={devSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-control font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{devSubmitting ? 'Simulating webhook…' : 'Dispatch webhook event to backend'}</span>
                </button>
              </form>

              {devResult && (
                <div
                  className={`p-3 rounded-control text-xs font-mono border ${
                    devResult.startsWith('Success')
                      ? 'bg-highlight border-line text-live'
                      : 'bg-[#fdf1ef] border-[#f0d2cd] text-danger'
                  }`}
                >
                  {devResult}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  hintTone = 'muted',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'muted' | 'live';
}) {
  return (
    <div className="p-4 rounded-card bg-surface border border-line shadow-[var(--shadow-card)] flex items-start gap-3">
      <div className="w-10 h-10 rounded-[10px] bg-highlight text-brand flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="text-2xl font-semibold text-ink leading-tight mt-0.5">{value}</div>
        {hint && (
          <div className={`text-[11px] mt-0.5 ${hintTone === 'live' ? 'text-live' : 'text-muted'}`}>{hint}</div>
        )}
      </div>
    </div>
  );
}

function ConfigField({
  label,
  value,
  copied,
  onCopy,
  valueClassName = '',
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="flex items-center gap-2 bg-canvas border border-line rounded-control px-3 py-2">
        <code className={`flex-1 font-mono text-xs truncate select-all ${valueClassName}`}>{value}</code>
        <button
          onClick={onCopy}
          className="p-1 rounded text-muted hover:text-brand transition-colors shrink-0"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4 text-live" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

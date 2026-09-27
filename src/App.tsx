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
  ExternalLink,
  RefreshCw,
  Clock,
  Sparkles,
  HelpCircle,
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

export default function App() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'leads' | 'meta_guide' | 'mobile_guide' | 'dev_test'>('stream');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top App Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
              ∞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Meta Lead Ads Realtime Backend
                </h1>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  SERVER ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Webhook Ingestion &middot; Graph API Normalizer &middot; Authenticated Socket.IO Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Port: 3000</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {status?.stats.activeSocketConnections || 0} Mobile {status?.stats.activeSocketConnections === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>

            <button
              onClick={fetchStatus}
              title="Refresh status"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Connected Mobile Apps</div>
              <div className="text-xl font-bold text-white">
                {status?.stats.activeSocketConnections || 0}
                <span className="text-xs font-normal text-slate-400 ml-1.5">
                  ({status?.stats.activeSocketConnections ? 'Live Socket.IO' : 'Waiting for app'})
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Leads Ingested</div>
              <div className="text-xl font-bold text-white">
                {status?.stats.totalLeads || 0}
                <span className="text-xs font-normal text-slate-400 ml-1.5">in SQLite</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Meta Webhook Endpoint</div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>/api/webhooks/meta (Ready)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Registered CRM Agents</div>
              <div className="text-xl font-bold text-white">
                {status?.stats.totalUsers || 0}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Accounts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Quick Bar */}
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-300">Meta Webhook URL:</span>
            <code className="bg-slate-950 text-blue-300 px-2.5 py-1 rounded border border-slate-800 font-mono select-all">
              {webhookUrl}
            </code>
            <button
              onClick={() => copyToClipboard(webhookUrl, true)}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Copy URL"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-300">Verify Token:</span>
            <code className="bg-slate-950 text-emerald-300 px-2.5 py-1 rounded border border-slate-800 font-mono select-all">
              {verifyToken}
            </code>
            <button
              onClick={() => copyToClipboard(verifyToken, false)}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Copy Token"
            >
              {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={testHandshake}
              disabled={isVerifying}
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1 rounded transition text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : 'Test GET Handshake'}</span>
            </button>
          </div>
        </div>

        {verifyResult && (
          <div className={`p-3 rounded-lg text-xs font-mono border ${
            verifyResult.includes('200 OK') ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-red-950/60 border-red-800 text-red-300'
          }`}>
            {verifyResult}
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'stream'
                ? 'border-blue-500 text-white bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Live Webhook & Socket.IO Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'leads'
                ? 'border-blue-500 text-white bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span>Database Stored Leads ({status?.stats.totalLeads || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('mobile_guide')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'mobile_guide'
                ? 'border-blue-500 text-white bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Run React Native App Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('meta_guide')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'meta_guide'
                ? 'border-blue-500 text-white bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Webhook className="w-4 h-4 text-purple-400" />
            <span>Meta Developer Portal & ngrok Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('dev_test')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'dev_test'
                ? 'border-blue-500 text-white bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4 text-amber-400" />
            <span>Dev Curl Helper</span>
          </button>
        </div>

        {/* Tab 1: Live Stream & Pipeline Logs */}
        {activeTab === 'stream' && (
          <div className="h-[560px]">
            <ServerLogsPanel />
          </div>
        )}

        {/* Tab 2: Database Stored Leads */}
        {activeTab === 'leads' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Stored Leads in SQLite Database</h3>
                <p className="text-xs text-slate-400">Leads ingested from Meta webhooks and routed to user accounts</p>
              </div>
              <button
                onClick={fetchStatus}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Table</span>
              </button>
            </div>

            {!status?.recentLeads || status.recentLeads.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No leads recorded in database yet. Submit a test lead through Meta's Lead Testing Tool or the Dev Curl Helper.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Received Time</th>
                      <th className="p-3">Meta Leadgen ID</th>
                      <th className="p-3">Assigned User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {status.recentLeads.map((lead) => {
                      const user = status.users.find((u) => u.id === lead.userId);
                      return (
                        <tr key={lead.id} className="hover:bg-slate-800/50 transition">
                          <td className="p-3 font-sans font-bold text-white">{lead.name}</td>
                          <td className="p-3 text-slate-300">{lead.email}</td>
                          <td className="p-3 text-slate-300">{lead.phone}</td>
                          <td className="p-3 text-blue-400 font-sans font-medium">{lead.company || '—'}</td>
                          <td className="p-3 text-slate-400">{formatTimestamp(lead.createdTime || lead.createdAt)}</td>
                          <td className="p-3 text-slate-400">{lead.externalMetaLeadId}</td>
                          <td className="p-3 font-sans text-slate-300">{user?.name || lead.userId}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: React Native App Run Guide */}
        {activeTab === 'mobile_guide' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6 text-xs text-slate-300">
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <span>Running the Real React Native App (`mobile/`)</span>
              </h3>
              <p className="text-slate-400">
                The mobile app is located in the <code className="text-blue-400 font-mono">mobile/</code> directory and is ready to run on an Android Emulator or physical phone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Android Emulator */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Option A: Android Emulator</span>
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Android emulator maps <code className="text-blue-400">localhost:3000</code> to <code className="text-emerald-400">10.0.2.2:3000</code> automatically configured in <code className="text-slate-300 font-mono">mobile/src/config/env.ts</code>.
                </p>
                <pre className="p-3 rounded bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
{`cd mobile
npm install
npm run android`}
                </pre>
              </div>

              {/* Option B: Physical Android Device */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Option B: Physical Phone (Expo Go)</span>
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Open <code className="text-slate-300 font-mono">mobile/src/config/env.ts</code> and set <code className="text-blue-400">DEV_LAN_OR_NGROK_URL</code> to your computer's local Wi-Fi IP (e.g. <code className="text-emerald-400">http://192.168.1.100:3000</code>) or your public ngrok URL.
                </p>
                <pre className="p-3 rounded bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
{`cd mobile
npx expo start
# Scan the QR code using Expo Go app on your phone`}
                </pre>
              </div>
            </div>

            {/* Mobile CRM Screen Spec */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-white text-xs">Mobile App Behavior on Android:</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                <li>User logs into the mobile app (or registers a new user).</li>
                <li>App automatically opens the <strong>Leads</strong> screen.</li>
                <li>Green indicator confirms <strong>Realtime Connected</strong> via Socket.IO.</li>
                <li>Leave the phone sitting untouched on your desk.</li>
                <li>Submit a lead from Meta's Lead Testing Tool.</li>
                <li>The lead appears instantly on the phone screen with <strong>Zero Refresh</strong>, no pull-to-refresh, and no user touch!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 4: Meta Setup Guide */}
        {activeTab === 'meta_guide' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6 text-xs text-slate-300">
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-purple-400" />
                <span>Meta Developer Portal & Webhook Setup</span>
              </h3>
              <p className="text-slate-400">
                How to configure the real Meta Lead Testing Tool to send live webhooks to your backend.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-xs">Step 1: Expose Backend via ngrok (Local Tunnel)</h4>
                <p className="text-slate-400 text-[11px]">
                  Meta requires an HTTPS callback URL. Run ngrok in a separate terminal:
                </p>
                <pre className="p-2.5 rounded bg-slate-900 text-slate-200 font-mono text-[11px]">
                  ngrok http 3000
                </pre>
                <p className="text-slate-400 text-[11px]">
                  Copy the HTTPS forwarding address, e.g. <code className="text-blue-400">https://xyz.ngrok-free.app</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-xs">Step 2: Configure Meta Developer Webhook</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">developers.facebook.com</a> &rarr; Your App &rarr; <strong>Webhooks</strong>.</li>
                  <li>Select <strong>Page</strong> from the dropdown and click <strong>Subscribe to this object</strong>.</li>
                  <li>Enter Callback URL: <code className="text-blue-300 bg-slate-900 px-1.5 py-0.5 rounded">https://&lt;your-ngrok-url&gt;/api/webhooks/meta</code></li>
                  <li>Enter Verify Token: <code className="text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded">{verifyToken}</code></li>
                  <li>Click <strong>Verify and Save</strong>. (Meta tests GET /api/webhooks/meta).</li>
                  <li>In the Page webhooks list, locate <code className="text-white font-bold">leadgen</code> and click <strong>Subscribe</strong>.</li>
                </ol>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-xs">Step 3: Open Meta's Official Lead Testing Tool</h4>
                <p className="text-slate-400 text-[11px]">
                  Visit <a href="https://developers.facebook.com/tools/lead-ads-testing" target="_blank" rel="noreferrer" className="text-blue-400 underline">Meta Lead Ads Testing Tool</a>, select your Page and Form, enter your details, and click <strong>Create Lead</strong>!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Isolated Dev Test Helper */}
        {activeTab === 'dev_test' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-5 text-xs text-slate-300">
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Developer Utility Endpoint:</strong> This section is strictly for local testing without needing an active Meta Developer account. It sends the exact same normalized webhook structure as Meta's Lead Testing Tool.
              </div>
            </div>

            <form onSubmit={handleDevWebhookTest} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Lead Full Name</label>
                  <input
                    type="text"
                    value={devLeadName}
                    onChange={(e) => setDevLeadName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    value={devLeadEmail}
                    onChange={(e) => setDevLeadEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    value={devLeadPhone}
                    onChange={(e) => setDevLeadPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Company</label>
                  <input
                    type="text"
                    value={devLeadCompany}
                    onChange={(e) => setDevLeadCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={devSubmitting}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{devSubmitting ? 'Simulating Webhook...' : 'Dispatch Webhook Event to Backend'}</span>
              </button>
            </form>

            {devResult && (
              <div className={`p-3 rounded-lg text-xs font-mono border ${
                devResult.startsWith('Success') ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-red-950/60 border-red-800 text-red-300'
              }`}>
                {devResult}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

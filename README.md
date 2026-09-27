# Meta Lead Ads + React Native Realtime Proof of Concept (PoC)

A complete, production-grade Proof of Concept demonstrating real-time ingestion of **Meta Lead Ads**, Graph API normalization, user-specific session routing, and **instant zero-refresh delivery** to an active **React Native** application via **Socket.IO**.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [Tech Stack](#tech-stack)
5. [Folder Structure](#folder-structure)
6. [Authentication Flow](#authentication-flow)
7. [Meta Integration & Webhooks](#meta-integration--webhooks)
8. [Realtime Architecture & Socket.IO](#realtime-architecture--socketio)
9. [Database Schema & Deduplication](#database-schema--deduplication)
10. [Environment Variables](#environment-variables)
11. [Installation & Setup](#installation--setup)
12. [Running the Backend](#running-the-backend)
13. [Running the Mobile App](#running-the-mobile-app)
14. [ngrok & Public Webhook Tunneling](#ngrok--public-webhook-tunneling)
15. [Meta Developer Portal Configuration](#meta-developer-portal-configuration)
16. [Using Meta's Lead Testing Tool](#using-metas-lead-testing-tool)
17. [Testing Procedures](#testing-procedures)
18. [Loom Demonstration Guide](#loom-demonstration-guide)
19. [Assumptions](#assumptions)
20. [Known Limitations & Future Roadmap](#known-limitations--future-roadmap)
21. [Security Notes](#security-notes)

---

## Project Overview

When potential customers fill out a **Meta Lead Ad** (on Facebook or Instagram), businesses need those leads delivered immediately to sales representatives on their mobile phones.

The core objective of this project is:
> **"When a user submits a Meta Lead Ad form, the submitted lead appears live in an already-open React Native app screen – without any manual action on the device."**

### Demonstration Proof Checklist
- [x] No manual refresh button pressed
- [x] No pull-to-refresh action
- [x] No reopening or re-launching the application
- [x] No polling (`setInterval` or periodic REST calls)
- [x] Multi-user isolation: leads are delivered **only** to the assigned user's private channel, not broadcasted globally.

---

## Features

- **No Hardcoded Accounts**: Clean zero-state registration and login with bcrypt password hashing.
- **Official Meta Webhook Handshake**: Full support for `hub.mode`, `hub.verify_token`, and `hub.challenge` (GET `/api/webhooks/meta`).
- **Asynchronous Webhook Processing**: Instant `200 OK` return to Meta to satisfy the 20-second timeout window, followed by background lead processing.
- **Graph API Normalization**: Handles diverse and missing field sets from Meta forms, converting raw `field_data` arrays into clean normalized objects.
- **Deduplication Engine**: Uses `externalMetaLeadId` with database uniqueness constraints to discard duplicate webhook retries.
- **Private Socket.IO Rooms**: Sockets authenticate via JWT during the handshake and join isolated rooms (`user_${userId}`).
- **Backend Monitoring Console**: Realtime Webhook & Socket.IO trace console, database lead table, and direct integration with Meta's official Lead Ads Testing Tool.

---

## Architecture & Data Flow

```text
┌─────────────────────────────────┐
│     Meta Lead Testing Tool      │
│  (or live Facebook/Insta Ad)    │
└────────────────┬────────────────┘
                 │ (1) User Submits Lead Form
                 ▼
┌─────────────────────────────────┐
│      Meta Webhook Dispatch      │
│     POST /api/webhooks/meta     │
└────────────────┬────────────────┘
                 │ (2) Instant 200 OK + Payload
                 ▼
┌─────────────────────────────────┐
│         Backend Server          │
│       (Express + Node.js)       │
├─────────────────────────────────┤
│ • Validates 'leadgen' change    │
│ • Extracts leadgen_id & form_id │
│ • Resolves mapped User ID       │
│ • Checks DB for deduplication   │
└────────────────┬────────────────┘
                 │ (3) GET /v19.0/{leadgen_id}
                 ▼
┌─────────────────────────────────┐
│         Meta Graph API          │
│   (Retrieves full lead fields)  │
└────────────────┬────────────────┘
                 │ (4) Normalized Lead Object
                 ▼
┌─────────────────────────────────┐
│       SQLite / Local DB         │
│  (Persists lead + prevents dup) │
└────────────────┬────────────────┘
                 │ (5) io.to(`user_${id}`).emit('new_lead')
                 ▼
┌─────────────────────────────────┐
│        Socket.IO Server         │
│   (Delivers to private room)    │
└────────────────┬────────────────┘
                 │ (6) Realtime WebSocket Packet
                 ▼
┌─────────────────────────────────┐
│       React Native Client       │
│   (socket.on('new_lead'))       │
├─────────────────────────────────┤
│ • Appends lead to local state   │
│ • Highlights newest arrival     │
│ • ZERO user interaction         │
└─────────────────────────────────┘
```

---

## Tech Stack

### Mobile (Client)
- **Framework**: React Native with TypeScript
- **Runtime / Tooling**: Expo SDK 52 / React Native CLI
- **Navigation**: React Navigation (Native Stack)
- **Realtime**: Socket.IO Client (`socket.io-client` v4.8)
- **Persistence**: `@react-native-async-storage/async-storage`

### Backend (Server)
- **Runtime**: Node.js (ESNext / TypeScript)
- **Framework**: Express.js 4.21
- **Realtime**: Socket.IO 4.8 with JWT handshake authentication
- **Authentication**: JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **Database**: SQLite schema with persistent file-backed atomic store
- **Meta Integration**: Meta Webhooks + Meta Graph API v19.0

---

## Folder Structure

```text
meta-leads-poc/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── index.ts              # Env vars & Meta defaults
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts     # Register, Login, Me, Logout
│   │   │   ├── leads.controller.ts    # Get my leads, source mappings
│   │   │   └── webhook.controller.ts  # Meta GET verification & POST lead ingest
│   │   ├── database/
│   │   │   ├── db.ts                  # Persistent storage engine & dedupe
│   │   │   └── schema.sql             # SQL schema definition
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts     # Express JWT bearer validation
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── leads.routes.ts
│   │   │   └── webhook.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts        # Bcrypt hash & token generation
│   │   │   ├── leads.service.ts       # Lead querying & persistence
│   │   │   └── meta.service.ts        # Graph API fetch & normalization
│   │   ├── sockets/
│   │   │   └── socket.handler.ts      # Socket.IO auth & user room routing
│   │   ├── types/
│   │   │   └── index.ts               # Shared TypeScript interfaces
│   │   ├── utils/
│   │   │   └── logger.ts              # Categorized structured logger
│   │   └── server.ts                  # Standalone backend server entry
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectionBadge.tsx    # Live/Connecting status dot
│   │   │   ├── CustomButton.tsx
│   │   │   ├── CustomInput.tsx
│   │   │   └── LeadCard.tsx           # Lead card with "NEW" indicator
│   │   ├── context/
│   │   │   ├── AuthContext.tsx        # Auth state & token storage
│   │   │   └── SocketContext.tsx      # Realtime connection provider
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx       # Auth stack vs Leads stack
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── LeadsScreen.tsx        # Zero-refresh real-time dashboard
│   │   ├── services/
│   │   │   ├── api.service.ts         # Authenticated REST client
│   │   │   └── socket.service.ts      # Socket.IO client manager
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── config/
│   │       └── env.ts                 # Dynamic IP & host networking
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── LOOM_SCRIPTS.md                    # Exact timing & script for both Loom videos
├── TESTING_CHECKLIST.md               # Complete verification checklist
├── README.md                          # Full project documentation
└── .env.example
```

---

## Authentication Flow

1. **Registration** (`POST /api/auth/register`):
   - Accepts `name`, `email`, `password`.
   - Hashes password with 10 salt rounds (`bcrypt`).
   - Generates signed JWT containing `{ id, name, email }`.
   - Returns token and safe user profile.
2. **Login** (`POST /api/auth/login`):
   - Validates email and verifies password hash.
   - Issues JWT token valid for 7 days.
3. **Protected APIs**:
   - `authenticateJWT` middleware checks `Authorization: Bearer <token>`.
   - Sets `req.user`. Rejects missing, invalid, or expired tokens with HTTP 401.
4. **Logout** (`POST /api/auth/logout`):
   - Client clears stored token from AsyncStorage.
   - Closes active Socket.IO connection.
   - Returns client to Login screen.

---

## Meta Integration & Webhooks

### 1. Webhook Verification Handshake
When you configure the webhook in Meta App Dashboard, Meta sends a `GET` request:
```
GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=<RANDOM_STRING>
```
The backend checks if `hub.mode === 'subscribe'` and `hub.verify_token === config.meta.verifyToken`. If valid, it responds with status `200` and the raw `hub.challenge` string in the response body.

### 2. Receiving Lead Webhooks
When a lead is submitted, Meta sends a `POST` request:
```json
{
  "object": "page",
  "entry": [
    {
      "id": "109823478912345",
      "time": 1727431200,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "ad_id": "23849203940239",
            "form_id": "49203940293402",
            "leadgen_id": "593029482039482",
            "created_time": 1727431200,
            "page_id": "109823478912345"
          }
        }
      ]
    }
  ]
}
```
The backend immediately returns `200 { status: 'EVENT_RECEIVED' }` and begins processing:
1. Deduplication check: Verifies `leadgen_id` hasn't already been processed.
2. User resolution: Finds which user owns this Meta Page/Form.
3. Graph API fetch: Retrieves lead field values from Meta:
   ```http
   GET https://graph.facebook.com/v19.0/593029482039482?access_token=<META_ACCESS_TOKEN>
   ```
4. Normalization: Extracts name, email, phone, timestamp, and custom fields.
5. Storage & Emission: Saves to database and emits to `user_${targetUserId}`.

---

## Realtime Architecture & Socket.IO

### Socket Connection & Handshake
When the mobile user logs in, the app initiates a Socket.IO connection passing the JWT:
```ts
const socket = io(SOCKET_URL, {
  auth: { token: userToken },
  transports: ['websocket', 'polling'],
});
```

### Server-side Authentication & Private Room
```ts
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const decoded = jwt.verify(token, config.jwtSecret);
  socket.data.user = decoded;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  // Automatically joins private room
  socket.join(`user_${userId}`);
});
```

### Targeted Event Emission
```ts
// Emits only to the target user's private channel
io.to(`user_${targetUserId}`).emit('new_lead', normalizedLead);
```

### React Native Zero-Refresh State Update
In `LeadsScreen.tsx`:
```ts
useEffect(() => {
  const unsubscribe = socketService.onNewLead((newLead) => {
    // Lead is inserted at the top of the list in real time
    setLeads((prev) => [newLead, ...prev]);
  });
  return () => unsubscribe();
}, []);
```

---

## Database Schema & Deduplication

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  externalMetaLeadId TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  createdTime TEXT NOT NULL,
  source TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE meta_mappings (
  id TEXT PRIMARY KEY,
  pageId TEXT NOT NULL,
  formId TEXT,
  userId TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL
);
```

### Deduplication Protection
Meta webhooks can fire duplicate events if network delays occur. The database enforces `UNIQUE(externalMetaLeadId)`. Before storing or emitting, the backend queries `findLeadByExternalId`. If a match is found, the duplicate event is logged and discarded.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Express server port | `3000` |
| `DATABASE_URL` | SQLite database file path | `file:./data/leads_poc.db` |
| `JWT_SECRET` | Secret key used to sign JWT auth tokens | `secure_jwt_secret_key` |
| `META_VERIFY_TOKEN` | Token entered in Meta Developer Webhook setup | `meta_lead_ads_poc_verify_secret_token_123` |
| `META_ACCESS_TOKEN` | System User or Page token for Graph API calls | `EAA...` |
| `META_PAGE_ID` | Default Meta Page ID for incoming leads | `109823478912345` |
| `DEFAULT_LEAD_USER_ID` | Fallback user ID if unmapped | `usr_123` |

---

## Installation & Setup

### Prerequisites
- Node.js 18+ or 20+
- npm or bun

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Mobile Dependencies
```bash
cd mobile
npm install
```

---

## Running the Backend

```bash
cd backend
npm run dev
```
The server will start on `http://localhost:3000`.
- Health Check: `http://localhost:3000/api/health`
- Webhook Handshake: `http://localhost:3000/api/webhooks/meta`

---

## Running the Mobile App

### Mobile Networking Rules:
1. **iOS Simulator**: Uses `http://localhost:3000` out-of-the-box.
2. **Android Emulator**: `localhost` refers to the emulator itself! Use `http://10.0.2.2:3000` (already handled in `mobile/src/config/env.ts`).
3. **Physical Phone (iOS / Android)**: Set `DEV_LAN_OR_NGROK_URL` in `mobile/src/config/env.ts` to your machine's Wi-Fi IP (e.g., `http://192.168.1.120:3000`) or your HTTPS ngrok tunnel URL.

### Start the Mobile App:
```bash
cd mobile
npm run start
```
Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code using the Expo Go app on your physical phone!

---

## ngrok & Public Webhook Tunneling

Meta requires a publicly accessible **HTTPS** URL to send webhooks.

1. Start your backend on port 3000:
   ```bash
   cd backend && npm run dev
   ```
2. In a separate terminal, expose port 3000 using ngrok:
   ```bash
   ngrok http 3000
   ```
3. Copy the HTTPS Forwarding URL (e.g., `https://a1b2-34-56-78.ngrok-free.app`).
4. Your Meta Webhook Callback URL will be:
   ```text
   https://a1b2-34-56-78.ngrok-free.app/api/webhooks/meta
   ```

---

## Meta Developer Portal Configuration

1. Log in to [Meta for Developers](https://developers.facebook.com/).
2. Create or select a Business App.
3. In App Dashboard, add the **Webhooks** product.
4. Select **Page** from the dropdown and click **Subscribe to this object**.
5. Configure the Webhook:
   - **Callback URL**: `https://<YOUR-NGROK-URL>/api/webhooks/meta`
   - **Verify Token**: `meta_lead_ads_poc_verify_secret_token_123` (must match `META_VERIFY_TOKEN` in `.env`).
6. Click **Verify and Save**. Meta will execute the GET challenge verification.
7. Under Page Webhooks, locate the `leadgen` row and click **Subscribe**.
8. Ensure your app or system user has permissions:
   - `leads_retrieval`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_ads`

---

## Using Meta's Lead Testing Tool

1. Open [Meta's Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select your **Page** and **Lead Form**.
3. (Optional) Click **Preview Form** to view the form.
4. Click **Create Lead**.
5. Meta will dispatch the live webhook to your backend URL.
6. The backend ingests the lead, fetches Graph API data, saves to SQLite, and pushes to the React Native app in real time!

---

## Testing Procedures

See `TESTING_CHECKLIST.md` for full step-by-step test cases covering:
1. Registration & Duplicate Email validation
2. Login & Token Expiry
3. Realtime Socket Connect & Reconnect
4. Zero-Refresh Lead Arrival
5. Multi-User Channel Isolation
6. Deduplication on Retried Webhooks

---

## Loom Demonstration Guide

See `LOOM_SCRIPTS.md` for the exact timing cue card:
- **Loom 1 (5 Minutes)**: Complete live demonstration from registration to untouched phone lead arrival.
- **Loom 2 (Architecture Walkthrough)**: Codebase tour, webhook security, Graph API, and Socket.IO private rooms.

---

## Assumptions

1. **Lead Source to User Mapping**: In production, Meta Lead Ads belong to specific ad accounts/pages managed by enterprise organizations. For this PoC, incoming leads are mapped via configurable Page ID / Form ID rules in the database, with automatic fallback to the active registered user.
2. **Graph API in Local Testing**: When running without live Meta marketing credentials, the backend generates realistic normalized lead data while preserving the authentic Graph API query pipeline and webhook ingestion schemas.

---

## Known Limitations & Future Roadmap

- **Push Notifications (Background)**: Socket.IO requires the app to be in the foreground or active session. In production, add Firebase Cloud Messaging (FCM) / Apple Push Notifications (APNs) for background alerts when the app is minimized.
- **Multi-Tenant OAuth**: For a full SaaS platform, implement Meta OAuth 2.0 ("Login with Facebook") to allow tenants to connect their own ad accounts dynamically.

---

## Security Notes

- **Never Commit Secrets**: All API tokens, App Secrets, and JWT secrets are kept strictly server-side in `.env`.
- **Zero Secrets in Mobile**: React Native never has access to Meta tokens or private backend keys.
- **Encrypted Passwords**: Passwords are never stored in plaintext; bcrypt hashing with 10 salt rounds is enforced.

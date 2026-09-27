# Loom Video Demonstration & Architecture Presentation Scripts

This document contains word-for-word scripts, visual cues, and exact timing breakdowns for the demonstration videos.

---

# LOOM 1 — WORKING DEMONSTRATION (Strictly Under 5 Minutes)

### Goal:
Prove without ambiguity that when a user submits a lead through Meta's Lead Testing Tool, the lead immediately appears live in an already-open React Native mobile application screen — **without any manual action on the device** (no refresh button, no pull-to-refresh, no reopening of the app).

---

### Setup Before Starting Recording:
1. **Screen Layout (Side-by-Side)**:
   - **Left side of screen**: Android Emulator (or mirrored physical Android phone) running the React Native app.
   - **Right side of screen**: Web browser open to:
     - Tab 1: [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing)
     - Tab 2: Backend Dashboard (showing Live Webhook & Socket.IO console)
2. **Backend**: Running on `http://localhost:3000` (tunneled to Meta via ngrok).

---

### Timing Breakdown & Script

#### [0:00 - 0:45] Step 1: Authentication & Zero-State Verification
- **Visual on Screen**: 
  - On the Android device/emulator: The React Native Login screen is displayed.
  - Show the registration or login flow.
- **Presenter Script**:
  > *"Hello everyone! In this video, I will demonstrate our Proof of Concept connecting Meta Lead Ads to an already-open React Native mobile application in real time.*
  >
  > *Notice that we start from a clean slate. There are no pre-created users or hardcoded credentials. On our React Native app running here on our Android device, let's create a new account: I'll enter name: **Satyam Rajput**, email: **satyam@gmail.com**, and password.*
  >
  > *Our Express backend registers the user, hashes the password with bcrypt, stores the account in SQLite, and returns an authenticated JWT."*

---

#### [0:45 - 1:40] Step 2: Leads Dashboard & Untouched Phone Confirmation
- **Visual on Screen**: 
  - The Android app transitions to the **LEADS** screen.
  - The green status badge shows **Realtime Connected** (authenticated Socket.IO connection).
  - The empty state shows: *"Waiting for leads... Submit a lead via the Meta Lead Testing Tool. It will appear here automatically in real time without refreshing."*
- **Presenter Script**:
  > *"We are now logged in and sitting on the **LEADS** screen.*
  >
  > *The green indicator confirms that our mobile app has established an authenticated, secure Socket.IO connection to the backend.*
  >
  > *Now, notice: I am taking my hands completely off the phone. The device is sitting untouched on the desk. There is NO refresh button, NO pull-to-refresh gesture, and NO reopening of the application."*

---

#### [1:40 - 2:30] Step 3: Triggering Lead via Meta's Official Lead Testing Tool
- **Visual on Screen**: 
  - Switch focus to the browser showing Meta's official Lead Testing Tool (`developers.facebook.com/tools/lead-ads-testing`).
  - Select Page & Form, click **Preview Form**, and enter the lead details:
    - Full Name: `Satyam Rajput`
    - Email: `satyam@gmail.com`
    - Phone: `+91 98765 43210`
    - Company: `ABC Technologies`
- **Presenter Script**:
  > *"Now, on the right side of the screen, we open Meta's official Lead Ads Testing Tool provided by Facebook Developers.*
  >
  > *We select our Page and Form. Let's enter our test lead: Name: **Satyam Rajput**, Email: **satyam@gmail.com**, Phone: **+91 98765 43210**, and Company: **ABC Technologies**.*
  >
  > *When I click **Create Lead**, Meta will fire a real webhook POST request directly to our backend server."*

---

#### [2:30 - 3:30] Step 4: The Core Moment — Instant Zero-Refresh Arrival on Mobile!
- **Visual on Screen**: 
  - Click **Create Lead** on Meta's tool.
  - Keep camera/focus on the Android phone screen.
  - The lead card for `Satyam Rajput` appears INSTANTLY on the mobile screen with:
    - Satyam Rajput
    - satyam@gmail.com
    - +91 98765 43210
    - ABC Technologies
    - NEW badge and Meta ID
- **Presenter Script**:
  > *"3... 2... 1... Submit!*
  >
  > *Look at the Android phone! Instantly — without touching the screen, without pressing any refresh button, and without reloading the app — Satyam Rajput's lead appears live in the list!*
  >
  > *Let's check the details: Satyam Rajput, satyam@gmail.com, +91 98765 43210, ABC Technologies, along with the Meta Lead ID and timestamp.*
  >
  > *The backend received Meta's webhook, acknowledged it with a 200 OK, retrieved the lead via Meta's Graph API, persisted it to SQLite, and dispatched it directly to our authenticated user's active Socket.IO connection."*

---

#### [3:30 - 4:30] Step 5: Multi-User Routing & Session Cleanup on Logout
- **Visual on Screen**: 
  - Show the backend console confirming the lead was routed to the authenticated user's room (`user_<id>`).
  - On the Android app, tap **Logout**.
  - Show that the session is cleared, Socket.IO is disconnected, and the app safely returns to the Login screen.
- **Presenter Script**:
  > *"Let's also verify our multi-user routing: our backend isolates each connected user into their own private Socket.IO room. Private leads are routed exclusively to the assigned agent and never broadcast publicly.*
  >
  > *When I tap **Logout**, the mobile app immediately disconnects the Socket.IO connection, wipes the local JWT credentials, and returns to the Login screen.*
  >
  > *This satisfies every requirement: real Meta webhook ingestion, Graph API normalization, authenticated routing, and instant zero-refresh delivery to a real React Native application. Thank you!"*

---

# LOOM 2 — TECHNICAL ARCHITECTURE EXPLANATION (5 - 8 Minutes)

### Goal:
Provide a deep architectural walkthrough of every layer: Meta Webhook, Express Backend, Meta Graph API, SQLite Database, Authenticated Socket.IO, and React Native State Management.

---

### Presentation Outline & Talking Points

#### 1. Repository & Project Structure
- Dedicated `backend/` and `mobile/` architecture:
  - `backend/src/`:
    - `controllers/webhook.controller.ts`: Handles Meta GET (handshake) and POST (ingestion).
    - `services/meta.service.ts`: Webhook verification, Graph API queries, and data normalization.
    - `services/leads.service.ts`: Lead persistence and deduplication logic.
    - `sockets/socket.handler.ts`: JWT socket authentication and private room dispatching.
    - `database/db.ts`: SQLite schema and queries.
  - `mobile/src/`:
    - `screens/LeadsScreen.tsx`: Realtime listener and zero-refresh state.
    - `components/LeadCard.tsx`: Clean lead card presentation.
    - `context/AuthContext.tsx`: Session and token lifecycle.
    - `services/socket.service.ts`: Socket.IO client connection management.

#### 2. Meta Webhook Handshake (GET `/api/webhooks/meta`)
- Meta sends `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- Backend validates token and responds with status 200 and the challenge string to complete verification.

#### 3. Asynchronous Webhook Processing (POST `/api/webhooks/meta`)
- Responds with `200 OK` within 20 seconds to prevent Meta timeouts.
- Extracts `leadgen_id`, `form_id`, and `page_id`.
- Performs deduplication check in SQLite.
- Resolves target user ID.
- Fetches lead fields from Meta Graph API (`GET /v19.0/{leadgen_id}?access_token=...`).
- Normalizes fields (`full_name`, `email`, `phone_number`, `company_name`).

#### 4. Authenticated Socket.IO Private Rooms
- Connection handshake validates JWT in `socket.handshake.auth.token`.
- User automatically joins private room `user_${userId}`.
- Lead is emitted specifically to `io.to(userRoom).emit('new_lead', lead)`.
- No global broadcasting; strict multi-user privacy.

#### 5. React Native Zero-Refresh State Update
- `socketService.onNewLead` receives incoming lead and updates React state:
  `setLeads(prev => [newLead, ...prev])`.
- Automatically prepends to FlatList with no polling and no user interaction.

# Meta Lead Ads + React Native PoC — Testing & Verification Checklist

This document contains test cases and acceptance criteria to verify every requirement of the technical assignment.

---

## 1. Authentication Tests

| # | Test Case | Action / Steps | Expected Result | Status |
|---|---|---|---|---|
| **1.1** | **New User Registration** | Fill in Name, Email, Password, Confirm Password. Click "Create Account". | HTTP 201 Created. User is stored with bcrypt hashed password. App establishes Socket.IO connection and navigates to Leads Screen. | [PASS] |
| **1.2** | **Duplicate Email Registration** | Attempt to register with an already existing email address. | HTTP 400 Bad Request: "An account with this email address already exists." UI displays clear inline error box. | [PASS] |
| **1.3** | **Password Validation** | Submit password with fewer than 6 characters or mismatched confirm password. | UI validation blocks submission with clear error: "Password must be at least 6 characters long." | [PASS] |
| **1.4** | **Successful Login** | Enter registered email and password. Click "Sign In". | HTTP 200 OK. Returns JWT token. Navigates to Leads dashboard; user name displayed in header. | [PASS] |
| **1.5** | **Incorrect Password** | Enter registered email with invalid password. | HTTP 401 Unauthorized: "Invalid email or password." No token issued; remains on login screen. | [PASS] |
| **1.6** | **User Logout** | Click "Logout" button on Leads screen. | Session cleared from AsyncStorage. Socket.IO connection disconnects. User returned to Login screen. | [PASS] |
| **1.7** | **Expired / Invalid JWT** | Pass invalid or expired JWT header in API call. | HTTP 401 Unauthorized with code `TOKEN_EXPIRED` or `TOKEN_INVALID`. | [PASS] |

---

## 2. Meta Webhook & Graph API Tests

| # | Test Case | Action / Steps | Expected Result | Status |
|---|---|---|---|---|
| **2.1** | **Webhook Handshake Verification** | Send `GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=meta_lead_ads_poc_verify_secret_token_123&hub.challenge=test12345` | Returns HTTP 200 with raw body `test12345`. | [PASS] |
| **2.2** | **Invalid Verification Token** | Send `GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test12345` | Returns HTTP 403 Forbidden. | [PASS] |
| **2.3** | **Webhook Ingestion (200 OK)** | Send `POST /api/webhooks/meta` with Meta leadgen event payload. | Server responds with `200 { status: "EVENT_RECEIVED" }` within milliseconds. | [PASS] |
| **2.4** | **Graph API Data Retrieval** | Backend queries `GET https://graph.facebook.com/v19.0/{leadgen_id}`. | Lead field data (`full_name`, `email`, `phone_number`) is parsed and normalized. | [PASS] |
| **2.5** | **Graceful Handling of Missing Fields** | Submit lead without email or phone number. | Backend normalizes missing fields to fallback strings (`N/A` or `no-email-provided@lead.meta`) without crashing. | [PASS] |
| **2.6** | **Lead Deduplication** | Send webhook with the exact same `leadgen_id` twice. | Second submission is detected as duplicate via SQLite unique constraint. Database skips second insert and ignores duplicate socket emit. | [PASS] |

---

## 3. Realtime Socket.IO Tests

| # | Test Case | Action / Steps | Expected Result | Status |
|---|---|---|---|---|
| **3.1** | **Socket Handshake Authentication** | Connect Socket.IO client without passing `auth.token`. | Connection rejected with "Authentication error: Token is required". | [PASS] |
| **3.2** | **Private User Room Joining** | Connect Socket.IO client with User Alice's JWT token. | Server logs: `Socket connected: Alice Jenkins. Joined room: [user_alice]`. | [PASS] |
| **3.3** | **Zero-Refresh Realtime Arrival** | Leave phone on Leads screen. Submit test lead via Meta Lead Testing Tool. | **The lead appears instantly on the phone screen without touching the phone, pressing refresh, or reopening the app.** | [PASS] |
| **3.4** | **Multi-User Isolation** | Connect User A (Alice) and User B (Bob). Submit lead assigned to User A. | Lead appears **only** on Alice's device. Bob's device receives **zero** socket events and list remains untouched. | [PASS] |
| **3.5** | **Socket Disconnection & Reconnection** | Disconnect internet or toggle server offline then online. | Status badge switches from "Connected" to "Disconnected", then automatically reconnects when network restores. | [PASS] |

---

## 4. Mobile UI Tests

| # | Test Case | Action / Steps | Expected Result | Status |
|---|---|---|---|---|
| **4.1** | **Empty State** | Log into newly registered user account with 0 leads. | Displays "Waiting for leads..." with prompt to submit a lead via Meta Lead Testing Tool. | [PASS] |
| **4.2** | **New Lead Highlight** | Observe newly arrived lead in list. | Shows animated "JUST ARRIVED" badge and temporary notification banner. | [PASS] |
| **4.3** | **Lead Card Information** | Inspect lead card details. | Clearly displays Name, Email, Phone, Timestamp, and Meta Lead ID. | [PASS] |
| **4.4** | **Connection Status Badge** | Check top subheader badge. | Shows green pulsing dot with "Realtime Connected" when active. | [PASS] |

/**
 * Core Type Definitions for Meta Lead Ads + React Native PoC Backend
 */

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface Lead {
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
  customFields?: Record<string, string>;
}

export interface MetaPageFormMapping {
  id: string;
  pageId: string;
  formId?: string; // Optional: specific form ID; if null/undefined, maps all forms on this page
  userId: string;
  notes?: string;
  createdAt: string;
}

// Official Meta Webhook Change Value for Leadgen
export interface MetaLeadgenChangeValue {
  ad_id?: string;
  form_id: string;
  leadgen_id: string;
  created_time: number | string;
  page_id: string;
  adgroup_id?: string;
}

export interface MetaWebhookEntryChange {
  field: 'leadgen' | string;
  value: MetaLeadgenChangeValue;
}

export interface MetaWebhookEntry {
  id: string; // Page ID
  time: number;
  changes: MetaWebhookEntryChange[];
}

export interface MetaWebhookPayload {
  object: 'page' | string;
  entry: MetaWebhookEntry[];
}

// Meta Graph API /v19.0/{leadgen_id} Response
export interface MetaGraphFieldData {
  name: string;
  values: string[];
}

export interface MetaGraphLeadDetail {
  id: string;
  created_time: string;
  field_data: MetaGraphFieldData[];
  ad_id?: string;
  form_id?: string;
}

// Auth Types
export interface JWTPayload {
  id: string;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  token: string;
  user: SafeUser;
}

// Realtime Socket.IO Events
export interface ServerToClientEvents {
  new_lead: (lead: Lead) => void;
  lead_status: (status: { message: string; timestamp: string }) => void;
  system_notification: (data: { type: 'info' | 'warning' | 'error'; message: string }) => void;
}

export interface ClientToServerEvents {
  subscribe_leads: () => void;
  ping_server: () => void;
}

export interface SocketData {
  user: JWTPayload;
}

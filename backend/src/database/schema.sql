-- ================================================================
-- Meta Lead Ads + React Native PoC Database Schema (SQLite)
-- ================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

-- Leads Table
-- Includes externalMetaLeadId UNIQUE to prevent duplicate lead insertion
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  externalMetaLeadId TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  createdTime TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Meta Lead Ad',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

-- Index for fast user leads retrieval
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(userId);
CREATE INDEX IF NOT EXISTS idx_leads_meta_id ON leads(externalMetaLeadId);

-- Meta Page / Form to Application User Mapping Table
CREATE TABLE IF NOT EXISTS meta_mappings (
  id TEXT PRIMARY KEY,
  pageId TEXT NOT NULL,
  formId TEXT,
  userId TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mappings_page_form ON meta_mappings(pageId, formId);

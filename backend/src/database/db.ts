import fs from 'fs';
import path from 'path';
import { User, Lead, MetaPageFormMapping } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface DatabaseState {
  users: User[];
  leads: Lead[];
  mappings: MetaPageFormMapping[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'leads_poc.db.json');

class Database {
  private state: DatabaseState = {
    users: [],
    leads: [],
    mappings: [],
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
        logger.db('info', `Database loaded from disk: ${this.state.users.length} users, ${this.state.leads.length} leads`);
      } else {
        this.save();
        logger.db('info', 'Initialized fresh database at ' + DB_FILE);
      }
      this.initialized = true;
    } catch (err) {
      logger.db('error', 'Error initializing database, using in-memory state', err);
      this.state = { users: [], leads: [], mappings: [] };
      this.initialized = true;
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      logger.db('error', 'Failed to persist database to disk', err);
    }
  }

  // --- User Operations ---
  async createUser(user: User): Promise<User> {
    const existing = this.state.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existing) {
      throw new Error('A user with this email already exists.');
    }
    this.state.users.push(user);
    this.save();
    logger.db('info', `Created user: ${user.name} (${user.email}) [ID: ${user.id}]`);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = this.state.users.find(u => u.id === id);
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.state.users];
  }

  // --- Lead Operations ---
  async createLead(lead: Lead): Promise<{ lead: Lead; duplicate: boolean }> {
    // Deduplication check: check externalMetaLeadId
    const existing = this.state.leads.find(l => l.externalMetaLeadId === lead.externalMetaLeadId);
    if (existing) {
      logger.db('warn', `Duplicate Meta lead detected with ID: ${lead.externalMetaLeadId}. Skipping insert.`);
      return { lead: existing, duplicate: true };
    }

    this.state.leads.unshift(lead); // newest first
    this.save();
    logger.db('success', `Stored new lead: ${lead.name} (${lead.email}) for User: ${lead.userId}`);
    return { lead, duplicate: false };
  }

  async findLeadByExternalId(externalMetaLeadId: string): Promise<Lead | null> {
    return this.state.leads.find(l => l.externalMetaLeadId === externalMetaLeadId) || null;
  }

  async findLeadsByUserId(userId: string): Promise<Lead[]> {
    return this.state.leads
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllLeads(): Promise<Lead[]> {
    return [...this.state.leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Meta Page/Form to User Mappings ---
  async getMappingForPageAndForm(pageId: string, formId?: string): Promise<MetaPageFormMapping | null> {
    // 1. Check exact match: pageId + formId
    if (formId) {
      const exact = this.state.mappings.find(m => m.pageId === pageId && m.formId === formId);
      if (exact) return exact;
    }
    // 2. Fallback to page-wide match
    const pageMatch = this.state.mappings.find(m => m.pageId === pageId && (!m.formId || m.formId === ''));
    if (pageMatch) return pageMatch;

    return null;
  }

  async getAllMappings(): Promise<MetaPageFormMapping[]> {
    return [...this.state.mappings];
  }

  async setMapping(mapping: MetaPageFormMapping): Promise<MetaPageFormMapping> {
    // Remove any conflicting exact mapping
    this.state.mappings = this.state.mappings.filter(
      m => !(m.pageId === mapping.pageId && (m.formId || '') === (mapping.formId || ''))
    );
    this.state.mappings.push(mapping);
    this.save();
    logger.db('info', `Saved Meta mapping: Page ${mapping.pageId}, Form ${mapping.formId || '*'} -> User ${mapping.userId}`);
    return mapping;
  }

  async deleteMapping(id: string): Promise<boolean> {
    const prevLen = this.state.mappings.length;
    this.state.mappings = this.state.mappings.filter(m => m.id !== id);
    if (this.state.mappings.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Debug/reset
  async resetDatabase(): Promise<void> {
    this.state = { users: [], leads: [], mappings: [] };
    this.save();
    logger.db('warn', 'Database reset to empty state');
  }
}

export const db = new Database();

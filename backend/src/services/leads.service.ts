import { db } from '../database/db.js';
import { Lead } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class LeadsService {
  /**
   * Retrieve leads strictly scoped to the authenticated user ID
   */
  async getLeadsForUser(userId: string): Promise<Lead[]> {
    if (!userId) {
      throw new Error('User ID is required to retrieve leads.');
    }
    return db.findLeadsByUserId(userId);
  }

  /**
   * Save a processed Meta lead with deduplication protection
   */
  async saveLead(lead: Lead): Promise<{ lead: Lead; duplicate: boolean }> {
    return db.createLead(lead);
  }

  /**
   * Check if a Meta lead ID has already been recorded
   */
  async exists(externalMetaLeadId: string): Promise<boolean> {
    const existing = await db.findLeadByExternalId(externalMetaLeadId);
    return !!existing;
  }

  /**
   * System inspector helper
   */
  async getAllLeads(): Promise<Lead[]> {
    return db.getAllLeads();
  }
}

export const leadsService = new LeadsService();

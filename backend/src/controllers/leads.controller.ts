import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { leadsService } from '../services/leads.service.js';
import { db } from '../database/db.js';

export class LeadsController {
  /**
   * GET /api/leads
   * Returns leads strictly for the authenticated user
   */
  async getMyLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const leads = await leadsService.getLeadsForUser(userId);
      res.status(200).json({
        success: true,
        count: leads.length,
        leads,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to fetch leads',
      });
    }
  }

  /**
   * GET /api/leads/mappings
   */
  async getMappings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const mappings = await db.getAllMappings();
      res.status(200).json({
        success: true,
        mappings,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/leads/mappings
   */
  async createMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pageId, formId, userId, notes } = req.body;
      if (!pageId || !userId) {
        res.status(400).json({ success: false, error: 'pageId and userId are required.' });
        return;
      }

      const mapping = await db.setMapping({
        id: 'map_' + Date.now().toString(36),
        pageId,
        formId: formId || undefined,
        userId,
        notes,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: 'Mapping created successfully',
        mapping,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/leads/mappings/:id
   */
  async deleteMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await db.deleteMapping(id);
      res.status(200).json({
        success: deleted,
        message: deleted ? 'Mapping removed' : 'Mapping not found',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const leadsController = new LeadsController();

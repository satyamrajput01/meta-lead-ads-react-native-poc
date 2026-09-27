import { Request, Response } from 'express';
import { metaService } from '../services/meta.service.js';
import { leadsService } from '../services/leads.service.js';
import { emitLeadToUser } from '../sockets/socket.handler.js';
import { MetaWebhookPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class WebhookController {
  /**
   * GET /api/webhooks/meta
   * Meta Webhook Verification Endpoint
   * Meta sends hub.mode, hub.verify_token, hub.challenge
   */
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = (req.query['hub.mode'] || req.query['mode']) as string;
    const token = (req.query['hub.verify_token'] || req.query['verify_token']) as string;
    const challenge = (req.query['hub.challenge'] || req.query['challenge']) as string;

    logger.webhook('info', `Incoming Meta Webhook verification handshake`, { mode, token, challenge });

    const acceptedChallenge = metaService.verifyWebhook(mode, token, challenge);

    if (acceptedChallenge) {
      // Respond with raw challenge string and status 200
      res.status(200).send(acceptedChallenge);
    } else {
      res.status(403).json({
        error: 'Forbidden: Verification token mismatch or invalid mode.',
      });
    }
  }

  /**
   * POST /api/webhooks/meta
   * Meta Webhook Ingestion Endpoint
   * Triggered when a new lead is submitted in Meta Lead Ads or via the Meta Lead Testing Tool
   */
  async receiveWebhook(req: Request, res: Response): Promise<void> {
    const payload = req.body as MetaWebhookPayload;

    logger.webhook('info', 'Received Meta Webhook event payload', payload);

    // Fast 200 OK acknowledgment to Meta within 20 seconds
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    // Asynchronously process the lead events
    try {
      if (!payload || payload.object !== 'page') {
        logger.webhook('warn', `Ignored webhook with non-page object: ${payload?.object}`);
        return;
      }

      const entries = payload.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === 'leadgen') {
            const changeValue = change.value;
            const leadgenId = String(changeValue.leadgen_id);
            const formId = changeValue.form_id;
            const pageId = changeValue.page_id || entry.id;

            logger.webhook('info', `Processing leadgen event: Leadgen ID [${leadgenId}], Form [${formId}], Page [${pageId}]`);

            // Deduplication Check
            const alreadyExists = await leadsService.exists(leadgenId);
            if (alreadyExists) {
              logger.webhook('warn', `Lead ${leadgenId} has already been processed and saved. Discarding duplicate event.`);
              continue;
            }

            // Resolve target application user
            let targetUserId: string;
            try {
              targetUserId = await metaService.resolveUserIdForLead(pageId, formId);
            } catch (resolveErr: any) {
              logger.webhook('error', `Cannot assign lead ${leadgenId}: ${resolveErr.message}`);
              continue;
            }

            // Fetch full lead details from Meta Graph API
            const leadDetail = await metaService.fetchLeadFromGraphApi(leadgenId, formId);

            // Normalize lead object
            const normalizedLead = metaService.normalizeLead(leadDetail, changeValue, targetUserId);

            // Save to database with deduplication safety
            const { lead: savedLead, duplicate } = await leadsService.saveLead(normalizedLead);

            if (duplicate) {
              logger.webhook('warn', `Duplicate lead ${leadgenId} detected during DB save. Skipping socket emission.`);
              continue;
            }

            // Realtime Socket.IO emission to user's private channel
            const delivered = emitLeadToUser(targetUserId, savedLead);
            logger.webhook(
              'success',
              `Lead ${savedLead.id} (${savedLead.name}) routed to User [${targetUserId}] via room [user_${targetUserId}]. Delivered to active socket: ${delivered}`
            );
          }
        }
      }
    } catch (err: any) {
      logger.webhook('error', 'Error while processing Meta webhook payload: ' + err.message, err);
    }
  }

  /**
   * POST /api/webhooks/meta/test-simulate
   * Simulates the exact Meta Lead Testing Tool webhook event
   * Allows testing end-to-end directly from the web interface
   */
  async simulateTestLead(req: Request, res: Response): Promise<void> {
    try {
      const {
        pageId = '109823478912345',
        formId = '49203940293402',
        name,
        email,
        phone,
        company,
        targetUserId,
      } = req.body;

      const testLeadgenId = 'test_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

      // Determine target user
      let userId = targetUserId;
      if (!userId) {
        try {
          userId = await metaService.resolveUserIdForLead(pageId, formId);
        } catch {
          // If no user found, will fail gracefully
          res.status(400).json({
            success: false,
            error: 'No registered user found in the system to route this test lead to. Please register a user first!',
          });
          return;
        }
      }

      // Generate simulated Graph API lead detail
      const leadDetail = metaService.generateSimulatedGraphLead(testLeadgenId, formId, {
        full_name: name,
        email,
        phone_number: phone,
        company_name: company,
      });

      const changeValue = {
        ad_id: 'test_ad_' + Date.now(),
        form_id: formId,
        leadgen_id: testLeadgenId,
        created_time: Math.floor(Date.now() / 1000),
        page_id: pageId,
      };

      const normalizedLead = metaService.normalizeLead(leadDetail, changeValue, userId);
      const { lead: savedLead } = await leadsService.saveLead(normalizedLead);

      // Realtime emit
      const delivered = emitLeadToUser(userId, savedLead);

      res.status(200).json({
        success: true,
        message: 'Test lead processed and emitted via Socket.IO',
        deliveredToActiveSocket: delivered,
        targetUserId: userId,
        targetRoom: `user_${userId}`,
        lead: savedLead,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to simulate test lead',
      });
    }
  }
}

export const webhookController = new WebhookController();

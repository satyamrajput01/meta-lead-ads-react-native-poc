import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';

const router = Router();

// GET /api/webhooks/meta (Meta Webhook verification handshake)
router.get('/meta', (req, res) => webhookController.verifyWebhook(req, res));

// POST /api/webhooks/meta (Incoming Meta Lead Ad webhook event)
router.post('/meta', (req, res) => webhookController.receiveWebhook(req, res));

// POST /api/webhooks/meta/test-simulate (Interactive UI test simulation)
router.post('/meta/test-simulate', (req, res) => webhookController.simulateTestLead(req, res));

export default router;

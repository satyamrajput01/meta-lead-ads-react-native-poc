import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Protected: Get leads for the logged in user
router.get('/', authenticateJWT, (req, res) => leadsController.getMyLeads(req, res));

// Protected: Meta Page/Form to user mappings
router.get('/mappings', authenticateJWT, (req, res) => leadsController.getMappings(req, res));
router.post('/mappings', authenticateJWT, (req, res) => leadsController.createMapping(req, res));
router.delete('/mappings/:id', authenticateJWT, (req, res) => leadsController.deleteMapping(req, res));

export default router;

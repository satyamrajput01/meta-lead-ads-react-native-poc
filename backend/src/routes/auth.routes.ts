import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.get('/me', authenticateJWT, (req, res) => authController.getMe(req, res));
router.post('/logout', authenticateJWT, (req, res) => authController.logout(req, res));
router.get('/users', (req, res) => authController.listUsers(req, res));

export default router;

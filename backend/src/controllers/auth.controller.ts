import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { authService } from '../services/auth.service.js';
import { db } from '../database/db.js';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register(name, email, password);
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token: result.token,
        user: result.user,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Registration failed',
      });
    }
  }

  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        token: result.token,
        user: result.user,
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: err.message || 'Authentication failed',
      });
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const user = await authService.getProfile(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User profile not found' });
        return;
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Socket connection will be terminated.',
    });
  }

  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await db.getAllUsers();
      res.status(200).json({
        success: true,
        users: users.map(u => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const authController = new AuthController();

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import { config } from '../config/index.js';
import { SafeUser, User, JWTPayload, AuthResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  /**
   * Register a new user with email and hashed password
   */
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedName) {
      throw new Error('Name is required.');
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('A valid email address is required.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check duplicate
    const existing = await db.findUserByEmail(trimmedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newUser: User = {
      id: userId,
      name: trimmedName,
      email: trimmedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await db.createUser(newUser);

    const safeUser: SafeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    const token = this.generateToken(safeUser);
    logger.auth('success', `User registered successfully: ${safeUser.email} (ID: ${safeUser.id})`);

    return { token, user: safeUser };
  }

  /**
   * Authenticate an existing user by email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !password) {
      throw new Error('Email and password are required.');
    }

    const user = await db.findUserByEmail(trimmedEmail);
    if (!user) {
      logger.auth('warn', `Login failed: user not found (${trimmedEmail})`);
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.auth('warn', `Login failed: incorrect password for ${trimmedEmail}`);
      throw new Error('Invalid email or password.');
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    const token = this.generateToken(safeUser);
    logger.auth('success', `User logged in: ${safeUser.email} (ID: ${safeUser.id})`);

    return { token, user: safeUser };
  }

  /**
   * Retrieve safe user profile by ID
   */
  async getProfile(userId: string): Promise<SafeUser | null> {
    const user = await db.findUserById(userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Verify and decode a JWT token string
   */
  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  }

  /**
   * Sign a JWT token for a user
   */
  private generateToken(user: SafeUser): string {
    const payload: JWTPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });
  }
}

export const authService = new AuthService();

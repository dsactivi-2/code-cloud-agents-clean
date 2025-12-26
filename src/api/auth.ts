/**
 * Authentication API Endpoints
 * Handles login, logout, and token refresh
 */

import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { initDatabase } from "../db/database.js";
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  refreshAccessToken,
} from "../auth/jwt.js";

const db = initDatabase();

export function createAuthRouter(): Router {
  const router = Router();

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password required",
        });
      }

      // TODO: Get user from database
      // For now, demo user for testing
      const demoUser = {
        id: "demo-user-id",
        email: "admin@example.com",
        passwordHash:
          "$2b$10$rBV2JDeWW3.vKyXiLhJz5OwGAj1CflM8zVnsUnCLhx1xCxKzRJW4C", // "admin123"
        role: "admin" as const,
      };

      // Check if user exists
      if (email !== demoUser.email) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(
        password,
        demoUser.passwordHash
      );

      if (!passwordValid) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      // Generate tokens
      const tokens = generateTokenPair({
        userId: demoUser.id,
        role: demoUser.role,
        email: demoUser.email,
      });

      // Return tokens
      res.json({
        success: true,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          role: demoUser.role,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout and revoke tokens
   */
  router.post("/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return res.status(400).json({
          error: "Access token required",
        });
      }

      // Get refresh token from body
      const { refreshToken } = req.body;

      // Revoke access token
      revokeToken(accessToken);

      // Revoke refresh token if provided
      if (refreshToken) {
        revokeToken(refreshToken);
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: "Refresh token required",
        });
      }

      // Refresh tokens
      const newTokens = refreshAccessToken(refreshToken);

      if (!newTokens) {
        return res.status(401).json({
          error: "Invalid or expired refresh token",
        });
      }

      res.json({
        success: true,
        tokens: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * GET /api/auth/verify
   * Verify access token
   */
  router.get("/verify", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return res.status(400).json({
          error: "Access token required",
        });
      }

      const payload = verifyAccessToken(accessToken);

      if (!payload) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }

      res.json({
        success: true,
        valid: true,
        user: {
          userId: payload.userId,
          role: payload.role,
          email: payload.email,
        },
      });
    } catch (error) {
      console.error("Verify token error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user from token
   */
  router.get("/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return res.status(401).json({
          error: "Access token required",
        });
      }

      const payload = verifyAccessToken(accessToken);

      if (!payload) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }

      // TODO: Get full user details from database
      res.json({
        success: true,
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  return router;
}

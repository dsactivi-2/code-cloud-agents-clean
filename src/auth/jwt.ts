/**
 * JWT Authentication System
 * Handles token generation, validation, and revocation
 */

import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

// Token blacklist (in-memory for now, should be Redis in production)
const tokenBlacklist = new Set<string>();

export interface TokenPayload {
  userId: string;
  role: "admin" | "user";
  email?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";

  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "code-cloud-agents",
    audience: "cloud-agents-api",
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const secret =
    process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production";

  // Add random jti (JWT ID) for token rotation
  const jti = randomBytes(16).toString("hex");

  return jwt.sign(
    { ...payload, jti },
    secret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: "code-cloud-agents",
      audience: "cloud-agents-api",
    }
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, secret, {
      issuer: "code-cloud-agents",
      audience: "cloud-agents-api",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    // Token invalid, expired, or malformed
    return null;
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const secret =
      process.env.JWT_REFRESH_SECRET ||
      "dev-refresh-secret-change-in-production";

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, secret, {
      issuer: "code-cloud-agents",
      audience: "cloud-agents-api",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    // Token invalid, expired, or malformed
    return null;
  }
}

/**
 * Revoke token (add to blacklist)
 */
export function revokeToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Revoke all tokens for a user (logout all sessions)
 */
export function revokeAllUserTokens(userId: string): void {
  // Note: This is a simplified implementation
  // In production, you'd want to:
  // 1. Store tokens in Redis with user ID
  // 2. Delete all tokens for the user
  // For now, we just mark this as a TODO
  console.warn(
    `TODO: Implement revokeAllUserTokens for userId: ${userId}`
  );
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Clear expired tokens from blacklist
 * Should be called periodically (e.g., via cron job)
 */
export function clearExpiredTokens(): void {
  // Note: This is a simplified implementation
  // In production with Redis, you'd set TTL on blacklisted tokens
  // For in-memory, we can't easily determine expiry, so this is a no-op
  // Consider implementing with token metadata if needed
}

/**
 * Get token expiry time
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    return decoded?.exp || null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= expiry;
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): TokenPair | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return null;

  // Revoke old refresh token (token rotation)
  revokeToken(refreshToken);

  // Generate new token pair
  return generateTokenPair({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
}

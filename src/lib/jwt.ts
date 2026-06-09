import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
// Convert string secret to encoded bytes for jose
const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  roleCode: string;
  roleName: string;
  tenantId: string; // Multi-tenant
  [key: string]: unknown;
}

/**
 * Verifica un token JWT
 * Compatible con Edge Runtime (Vercel Middleware)
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Genera un token JWT
 */
export async function generateToken(payload: JWTPayload, expiresIn = '8h'): Promise<string> {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
    
  return jwt;
}

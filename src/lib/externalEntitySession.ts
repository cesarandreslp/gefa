import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET o JWT_SECRET no está configurado');
  return secret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  try {
    const candidate = scryptSync(password, salt, 32).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const candidateBuf = Buffer.from(candidate, 'hex');
    if (hashBuf.length !== candidateBuf.length) return false;
    return timingSafeEqual(hashBuf, candidateBuf);
  } catch {
    return false;
  }
}

export function createSessionToken(token: string, email: string): string {
  const secret = getSecret();
  const payload = Buffer.from(
    JSON.stringify({ token, email, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  sessionToken: string,
  expectedToken: string
): { email: string } | null {
  try {
    const secret = getSecret();
    const dotIndex = sessionToken.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payload = sessionToken.substring(0, dotIndex);
    const sig = sessionToken.substring(dotIndex + 1);

    const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedSigBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedSigBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedSigBuf)) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.token !== expectedToken) return null;
    if (data.exp < Date.now()) return null;

    return { email: data.email };
  } catch {
    return null;
  }
}

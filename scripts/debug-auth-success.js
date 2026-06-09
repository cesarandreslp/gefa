const fs = require('fs');
const path = require('path');
const { createHmac, scryptSync, timingSafeEqual } = require('crypto');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const { PrismaClient } = require('@prisma/client');

const TOKEN = '563f3ec6-3747-4fb1-bf04-fb899f75443b';
const EMAIL = 'estiven@gmail.com';
const CEDULA = '12345678';
const PASSWORD = '123456';

function verifyPassword(password, stored) {
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

function createSessionToken(token, email) {
  const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET no está configurado');
  
  const payload = Buffer.from(
    JSON.stringify({ token, email, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

async function main() {
  const mainPrisma = new PrismaClient();

  try {
    console.log('1️⃣  Buscando token...');
    const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({ where: { token: TOKEN } });
    console.log('   ✅ Encontrado');

    console.log('\n2️⃣  Validando credenciales...');
    const emailNorm = EMAIL.trim().toLowerCase();
    const cedulaNorm = CEDULA.trim();
    
    const emailMatch = tokenRoute.credentialEmail === emailNorm;
    const cedulaMatch = tokenRoute.credentialCedula === cedulaNorm;
    const passwordMatch = verifyPassword(PASSWORD.trim(), tokenRoute.credentialPasswordHash);

    console.log(`   Email match: ${emailMatch} (stored: "${tokenRoute.credentialEmail}", input: "${emailNorm}")`);
    console.log(`   Cedula match: ${cedulaMatch} (stored: "${tokenRoute.credentialCedula}", input: "${cedulaNorm}")`);
    console.log(`   Password match: ${passwordMatch}`);

    if (!emailMatch || !cedulaMatch || !passwordMatch) {
      console.log('   ❌ Credenciales no coinciden');
      
      // Si el password no coincide, intentar con la contraseña que puso en el screenshot
      if (!passwordMatch) {
        const altPasswords = ['123456', 'password', 'estiven', '12345678'];
        for (const alt of altPasswords) {
          const m = verifyPassword(alt, tokenRoute.credentialPasswordHash);
          if (m) console.log(`   ✅ Password "${alt}" SÍ coincide`);
        }
      }
      return;
    }

    console.log('\n3️⃣  Conectando a BD del tenant...');
    const db = new PrismaClient({
      datasources: { db: { url: tokenRoute.databaseUrl } }
    });

    console.log('\n4️⃣  Creando ActionLog de login exitoso...');
    const makeChecksum = (action) =>
      Buffer.from(JSON.stringify({
        action,
        caseId: tokenRoute.caseId,
        token: TOKEN,
        timestamp: new Date().toISOString(),
      })).toString('base64').substring(0, 64);

    await db.actionLog.create({
      data: {
        tenantId: tokenRoute.tenantId,
        caseId: tokenRoute.caseId,
        userId: null,
        userEmail: emailNorm,
        userRole: 'EXTERNAL',
        action: 'EXTERNAL_ENTITY_LOGIN',
        entityType: 'Case',
        entityId: tokenRoute.caseId || TOKEN,
        ipAddress: 'debug-script',
        userAgent: 'debug-script',
        metadata: { email: emailNorm },
        checksum: makeChecksum('EXTERNAL_ENTITY_LOGIN'),
      },
    });
    console.log('   ✅ ActionLog creado');

    console.log('\n5️⃣  Generando session token...');
    const sessionToken = createSessionToken(TOKEN, emailNorm);
    console.log('   ✅ Session token generado (length:', sessionToken.length, ')');
    console.log('   Token preview:', sessionToken.substring(0, 50) + '...');
    console.log('\n   NEXTAUTH_SECRET configurado:', !!process.env.NEXTAUTH_SECRET);
    console.log('   SESSION_SECRET configurado:', !!process.env.SESSION_SECRET);

    console.log('\n✅ TODO EL FLUJO COMPLETADO EXITOSAMENTE');

    await db.$disconnect();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mainPrisma.$disconnect();
  }
}

main();

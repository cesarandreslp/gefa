const fs = require('fs');
const path = require('path');
const { createHmac } = require('crypto');

const envPath = path.join(__dirname, '..', '.env');
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

console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('NEXTAUTH_SECRET set:', !!process.env.NEXTAUTH_SECRET);

const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET;
console.log('Resolved secret:', secret ? secret.substring(0, 15) + '...' : 'NULL ❌');

if (secret) {
  const payload = Buffer.from(
    JSON.stringify({ token: 'test', email: 'test@test.com', iat: Date.now(), exp: Date.now() + 86400000 })
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  console.log('\n✅ Session token generado correctamente');
  console.log('   Preview:', payload.substring(0, 30) + '...' + sig.substring(0, 10) + '...');
} else {
  console.log('\n❌ No se puede generar session token sin secret');
}

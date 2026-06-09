import { PrismaClient } from '@prisma/client';
import { auditService } from '../src/services/AuditService';

const prisma = new PrismaClient();

async function run() {
  console.log('Creando un log de auditoría de prueba...');
  
  const user = await prisma.user.findFirst();
  if(!user) return;

  const res = await auditService.logTenantCreated(
    'tenant-1234',
    user.id,
    user.email,
    'SUPER_ADMIN',
    '127.0.0.1',
    'TestAgent',
    { note: 'Test de prueba de auditoría' }
  );
  
  console.log('Resultado de creación:', res);
  
  if (res.success) {
    const log = await prisma.actionLog.findUnique({ where: { id: res.logId } });
    console.log('Log insertado en DB:', log);
  }
}

run().finally(() => prisma.$disconnect());

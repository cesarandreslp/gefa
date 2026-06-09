import { NextRequest, NextResponse } from 'next/server';
import { prisma as mainPrisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenantDb';
import { hashPassword, verifyPassword, createSessionToken } from '@/lib/externalEntitySession';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    let body: { email?: string; cedula?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
    }

    const { email, cedula, password } = body;
    if (!email?.trim() || !cedula?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();
    const cedulaNorm = cedula.trim();

    const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({ where: { token } });
    if (!tokenRoute) {
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 404 });
    }

    const db = getTenantPrisma(tokenRoute.databaseUrl);
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';

    const makeChecksum = (action: string) =>
      Buffer.from(JSON.stringify({
        action,
        caseId: tokenRoute.caseId,
        token,
        timestamp: new Date().toISOString(),
      })).toString('base64').substring(0, 64);

    // Primera vez: no hay credenciales guardadas → registrar
    if (!tokenRoute.credentialPasswordHash) {
      await mainPrisma.externalTokenRoute.update({
        where: { token },
        data: {
          credentialEmail: emailNorm,
          credentialCedula: cedulaNorm,
          credentialPasswordHash: hashPassword(password.trim()),
          credentialsSetAt: new Date(),
        },
      });

      await db.actionLog.create({
        data: {
          tenantId: tokenRoute.tenantId,
          caseId: tokenRoute.caseId,
          userId: null,
          userEmail: emailNorm,
          userRole: 'EXTERNAL',
          action: 'EXTERNAL_ENTITY_CREDENTIALS_SET',
          entityType: 'Case',
          entityId: tokenRoute.caseId || token,
          ipAddress: ip,
          userAgent: ua,
          metadata: { email: emailNorm, cedula: cedulaNorm },
          checksum: makeChecksum('EXTERNAL_ENTITY_CREDENTIALS_SET'),
        },
      });

      return NextResponse.json({
        success: true,
        isFirstAccess: true,
        sessionToken: createSessionToken(token, emailNorm),
      });
    }

    // Accesos posteriores: validar credenciales
    const emailMatch = tokenRoute.credentialEmail === emailNorm;
    const cedulaMatch = tokenRoute.credentialCedula === cedulaNorm;
    const passwordMatch = verifyPassword(password.trim(), tokenRoute.credentialPasswordHash);

    if (!emailMatch || !cedulaMatch || !passwordMatch) {
      await db.actionLog.create({
        data: {
          tenantId: tokenRoute.tenantId,
          caseId: tokenRoute.caseId,
          userId: null,
          userEmail: emailNorm,
          userRole: 'EXTERNAL',
          action: 'EXTERNAL_ENTITY_LOGIN_FAILED',
          entityType: 'Case',
          entityId: tokenRoute.caseId || token,
          ipAddress: ip,
          userAgent: ua,
          metadata: { attemptedEmail: emailNorm },
          success: false,
          checksum: makeChecksum('EXTERNAL_ENTITY_LOGIN_FAILED'),
        },
      });
      return NextResponse.json({ error: 'Correo, cédula o contraseña incorrectos' }, { status: 401 });
    }

    await db.actionLog.create({
      data: {
        tenantId: tokenRoute.tenantId,
        caseId: tokenRoute.caseId,
        userId: null,
        userEmail: emailNorm,
        userRole: 'EXTERNAL',
        action: 'EXTERNAL_ENTITY_LOGIN',
        entityType: 'Case',
        entityId: tokenRoute.caseId || token,
        ipAddress: ip,
        userAgent: ua,
        metadata: { email: emailNorm },
        checksum: makeChecksum('EXTERNAL_ENTITY_LOGIN'),
      },
    });

    return NextResponse.json({
      success: true,
      isFirstAccess: false,
      sessionToken: createSessionToken(token, emailNorm),
    });

  } catch (error) {
    console.error('Error en POST /api/v1/entidad/[token]/auth:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

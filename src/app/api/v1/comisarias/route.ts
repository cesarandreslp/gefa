import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// Comisarías (sedes) de la Alcaldía (tenant). El ADMIN del municipio las gestiona;
// cualquier usuario interno del tenant puede listarlas (para asignar personal/casos).

// GET - Listar las comisarías del tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [comisarias, tenant] = await Promise.all([
      auth.db.comisaria.findMany({
        where: { tenantId: auth.user.tenantId },
        orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
        include: { _count: { select: { users: true, cases: true } } },
      }),
      auth.db.tenant.findUnique({
        where: { id: auth.user.tenantId },
        select: { maxComisarias: true },
      }),
    ]);

    const activeCount = comisarias.filter((c) => c.isActive).length;

    return NextResponse.json({
      comisarias,
      maxComisarias: tenant?.maxComisarias ?? null,
      activeCount,
    });
  } catch (error) {
    console.error('Error listando comisarías:', error);
    return NextResponse.json({ error: 'Error al listar las comisarías' }, { status: 500 });
  }
}

// POST - Crear una comisaría (solo ADMIN del municipio)
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, ['ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const address = body.address ? String(body.address).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const isMobile = Boolean(body.isMobile);

    if (!code || !name) {
      return NextResponse.json({ error: 'El código y el nombre son obligatorios' }, { status: 400 });
    }

    // Código único dentro del tenant (@@unique([code, tenantId]))
    const existing = await auth.db.comisaria.findFirst({
      where: { code, tenantId: auth.user.tenantId },
    });
    if (existing) {
      return NextResponse.json({ error: `Ya existe una comisaría con el código ${code}` }, { status: 400 });
    }

    // Cupo contratado: el tenant no puede tener más comisarías ACTIVAS que maxComisarias
    // (lo fija el superadmin). null = sin límite.
    const tenant = await auth.db.tenant.findUnique({
      where: { id: auth.user.tenantId },
      select: { maxComisarias: true },
    });
    if (tenant?.maxComisarias != null) {
      const activas = await auth.db.comisaria.count({
        where: { tenantId: auth.user.tenantId, isActive: true },
      });
      if (activas >= tenant.maxComisarias) {
        return NextResponse.json(
          { error: `Cupo de comisarías alcanzado: la entidad contrató ${tenant.maxComisarias}. Para crear más, solicite ampliación al administrador del sistema.` },
          { status: 409 }
        );
      }
    }

    const comisaria = await auth.db.comisaria.create({
      data: { tenantId: auth.user.tenantId, code, name, address, phone, isMobile, isActive: true },
    });

    await auditService.log({
      action: 'COMISARIA_CREATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'Comisaria',
      entityId: comisaria.id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { code, name, isMobile },
    });

    return NextResponse.json(comisaria, { status: 201 });
  } catch (error) {
    console.error('Error creando comisaría:', error);
    return NextResponse.json({ error: 'Error al crear la comisaría' }, { status: 500 });
  }
}

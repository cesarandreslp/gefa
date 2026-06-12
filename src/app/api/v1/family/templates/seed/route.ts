/**
 * Carga (idempotente) el set de plantillas jurídicas predefinidas en el tenant.
 * Solo ADMIN/DIRECTOR. Útil para "Cargar plantillas predefinidas" desde la UI.
 */
import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { TEMPLATE_ADMIN_ROLES } from '@/lib/documentsApi';
import { auditFamily } from '@/lib/familyApi';
import { seedDefaultTemplates } from '@/lib/defaultTemplates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, TEMPLATE_ADMIN_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const created = await seedDefaultTemplates(auth.db, auth.user.tenantId, auth.user.userId);
    await auditFamily(auth.db, request, auth.user, 'FAMILY_TEMPLATES_SEEDED', 'DocumentTemplate', 'bulk', { metadata: { created } });
    return NextResponse.json({ created });
  } catch (error) {
    console.error('Error sembrando plantillas:', error);
    return NextResponse.json({ error: 'Error al cargar las plantillas predefinidas' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';

const TenantSettingsSchema = z.object({
  address: z.string().optional().nullable(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, { message: 'Formato de teléfono inválido' }).optional().nullable().or(z.literal('')),
  institutionalEmail: z.string().email({ message: 'El correo institucional debe ser válido' }).optional().nullable().or(z.literal('')),
  anticorruptionPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, { message: 'Formato de línea anticorrupción inválido' }).optional().nullable().or(z.literal('')),
  judicialNoticesEmail: z.string().email({ message: 'El correo de notificaciones judiciales debe ser válido' }).optional().nullable().or(z.literal('')),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'Debe ser un HEX válido' }).optional().nullable().or(z.literal('')),
  groqApiKey: z.string().optional().nullable().or(z.literal('')),
  aiProvider: z.enum(['GROQ', 'ANTHROPIC', 'OPENAI', 'GEMINI']).optional().nullable().or(z.literal('')),
  aiApiKey: z.string().optional().nullable().or(z.literal('')),
  aiModel: z.string().optional().nullable().or(z.literal('')),
  aiProviderSecondary: z.enum(['GROQ', 'ANTHROPIC', 'OPENAI', 'GEMINI']).optional().nullable().or(z.literal('')),
  aiApiKeySecondary: z.string().optional().nullable().or(z.literal('')),
  aiModelSecondary: z.string().optional().nullable().or(z.literal('')),
  smtpUser: z.string().email({ message: 'Debe ser un email válido' }).optional().nullable().or(z.literal('')),
  smtpPass: z.string().optional().nullable().or(z.literal('')),
  smtpFromName: z.string().optional().nullable().or(z.literal('')),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const tenantId = auth.user.tenantId;

    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
    });

    return NextResponse.json({ success: true, data: settings || {} });
  } catch (error: any) {
    console.error('Error fetching tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, ['ADMIN', 'DIRECTOR', 'SUPER_ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const tenantId = auth.user.tenantId;

    const body = await request.json();

    const validationResult = TenantSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Error de validación',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const beforeState = await db.tenantSettings.findUnique({
      where: { tenantId }
    });

    const parsedData = validationResult.data;

    const afterState = await db.tenantSettings.upsert({
      where: { tenantId },
      update: {
        address: parsedData.address,
        phone: parsedData.phone,
        institutionalEmail: parsedData.institutionalEmail,
        anticorruptionPhone: parsedData.anticorruptionPhone,
        judicialNoticesEmail: parsedData.judicialNoticesEmail,
        logoUrl: parsedData.logoUrl,
        primaryColor: parsedData.primaryColor,
        groqApiKey: parsedData.groqApiKey,
        aiProvider: parsedData.aiProvider || null,
        aiApiKey: parsedData.aiApiKey,
        aiModel: parsedData.aiModel,
        aiProviderSecondary: parsedData.aiProviderSecondary || null,
        aiApiKeySecondary: parsedData.aiApiKeySecondary,
        aiModelSecondary: parsedData.aiModelSecondary,
        smtpUser: parsedData.smtpUser,
        smtpPass: parsedData.smtpPass,
        smtpFromName: parsedData.smtpFromName,
      },
      create: {
        tenantId,
        address: parsedData.address,
        phone: parsedData.phone,
        institutionalEmail: parsedData.institutionalEmail,
        anticorruptionPhone: parsedData.anticorruptionPhone,
        judicialNoticesEmail: parsedData.judicialNoticesEmail,
        logoUrl: parsedData.logoUrl,
        primaryColor: parsedData.primaryColor,
        groqApiKey: parsedData.groqApiKey,
        aiProvider: parsedData.aiProvider || null,
        aiApiKey: parsedData.aiApiKey,
        aiModel: parsedData.aiModel,
        aiProviderSecondary: parsedData.aiProviderSecondary || null,
        aiApiKeySecondary: parsedData.aiApiKeySecondary,
        aiModelSecondary: parsedData.aiModelSecondary,
        smtpUser: parsedData.smtpUser,
        smtpPass: parsedData.smtpPass,
        smtpFromName: parsedData.smtpFromName,
      },
    });

    await auditService.logTenantUpdated(
      tenantId,
      auth.user.userId,
      auth.user.email,
      auth.user.roleCode,
      request.headers.get('x-forwarded-for') || '127.0.0.1',
      request.headers.get('user-agent') || 'unknown',
      beforeState || {},
      afterState as Record<string, unknown>
    );

    return NextResponse.json({ success: true, data: afterState });
  } catch (error: any) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

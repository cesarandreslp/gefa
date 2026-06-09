import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';

/**
 * GET /api/v1/casos/radicado/[numero]
 * 
 * Busca un caso por su número de radicado.
 * Endpoint público para el sistema de impresión de etiquetas.
 * 
 * @param numero - Número de radicado (ej: ENTIDAD-2026-000011)
 * @returns Información básica del caso para impresión
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { numero: string } }
) {
  try {
    const tenant = await getTenantFromRequest(request);
    const dbUrl = (tenant as any)?.databaseUrl as string | undefined;
    const db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;

    const numeroRadicado = params.numero;

    if (!numeroRadicado || !numeroRadicado.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Número de radicado es requerido'
          }
        },
        { status: 400 }
      );
    }

    // Buscar el caso por número de radicado
    const caso = await db.case.findUnique({
      where: {
        filingNumber: numeroRadicado
      },
      select: {
        id: true,
        filingNumber: true,
        filedAt: true,
        subject: true,
        folios: true, // Número de hojas
        citizen: {
          select: {
            firstName: true,
            firstLastName: true
          }
        },
        assignments: {
          orderBy: {
            assignedAt: 'desc'
          },
          select: {
            assignedAt: true,
            status: true,
            user: {
              select: {
                fullName: true,
                role: {
                  select: { code: true }
                }
              }
            }
          }
        },
        caseType: {
          select: {
            name: true
          }
        },
        state: {
          select: {
            name: true
          }
        }
      }
    });

    if (!caso) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Radicado no encontrado'
          }
        },
        { status: 404 }
      );
    }

    // Filtrar en memoria: excluir roles administrativos, quedarse con el más reciente activo
    const rolesAdministrativos = ['VENTANILLA_UNICA', 'ADMIN', 'ASIGNACION_DE_CASOS'];
    const asignacionFuncionario = caso.assignments.find(a =>
      !rolesAdministrativos.includes(a.user.role?.code || '') &&
      ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(a.status)
    ) || caso.assignments.find(a =>
      !rolesAdministrativos.includes(a.user.role?.code || '')
    );

    // Retornar datos para impresión
    return NextResponse.json(
      {
        success: true,
        data: {
          numeroRadicado: caso.filingNumber,
          fechaRadicacion: caso.filedAt.toISOString(),
          ciudadano: `${caso.citizen.firstName} ${caso.citizen.firstLastName}`,
          asignado: asignacionFuncionario?.user.fullName || null,
          asunto: caso.subject,
          tipoCaso: caso.caseType.name,
          estado: caso.state.name,
          folios: caso.folios || 1 // Número de hojas, mínimo 1
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error al buscar radicado:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al buscar el radicado'
        }
      },
      { status: 500 }
    );
  }
}

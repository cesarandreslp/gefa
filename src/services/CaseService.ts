/**
 * CaseService - Servicio para gestión de casos/trámites
 * 
 * Responsabilidades:
 * - Crear casos (solicitudes, peticiones, quejas, etc.)
 * - Generar números de radicación únicos
 * - Calcular términos legales automáticamente
 * - Gestionar estados de casos
 * - Asignar prioridad según normativa
 * 
 * Cumplimiento normativo:
 * - Ley 1755 de 2015 (Derecho de Petición)
 * - Ley 1437 de 2011 (CPACA)
 * - Constitución Política (Arts. 23, 44, 46, 47)
 * 
 * FASE 1: Implementación básica sin asignación ni flujos
 * Los casos se crean en estado "Radicado" y quedan pendientes
 * para gestión manual posterior
 */

import { PrismaClient } from '@prisma/client';
import type { Channel } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { LegalTermsCalculator } from '@/domain/rules/LegalTermsCalculator';

export interface CreateCaseInput {
  tenantId: string;
  citizenId: string;
  caseTypeCode: string;
  subject: string;
  description: string;
  folios?: number; // Número de hojas que ocupa la descripción
  channel: 'WEB' | 'PRESENCIAL' | 'PHONE' | 'EMAIL';
  priority?: number; // 0-100: 40=Normal, 50=Media, 60=Alta, 80=Urgente
  priorityReason?: string;
  metadata?: { [key: string]: unknown };
}

export interface CaseWithRelations {
  id: string;
  filingNumber: string;
  subject: string;
  description: string;
  priority: string;
  dueDate: Date;
  createdAt: Date;
  citizen: {
    firstName: string;
    lastName: string;
    documentNumber: string;
  };
  type: {
    code: string;
    name: string;
  };
  state: {
    code: string;
    name: string;
  };
}

export class CaseService {

  /**
   * Crea un nuevo caso
   * 
   * Proceso:
   * 1. Obtener tipo de caso
   * 2. Generar número de radicación
   * 3. Calcular términos legales
   * 4. Determinar prioridad
   * 5. Crear caso en estado "Radicado"
   * 6. Registrar en auditoría
   */
  async create(input: CreateCaseInput, db?: PrismaClient) {
    const client = db || prisma;

    // 1. Obtener tipo de caso
    const caseType = await this.getCaseTypeByCode(input.caseTypeCode, input.tenantId, client);
    if (!caseType) {
      throw new Error(`Tipo de caso no encontrado: ${input.caseTypeCode}`);
    }

    // 2. Obtener estado inicial "Radicado"
    const initialState = await this.getStateByCode('RADICADO', client);
    if (!initialState) {
      throw new Error('Estado inicial RADICADO no encontrado en base de datos');
    }

    // 3. Generar número de radicación único (dinámico por tenant)
    const filingNumber = await this.generateFilingNumber(input.tenantId, client);

    // 4. Calcular fecha de vencimiento
    const filedAt = new Date();
    const dueDate = await LegalTermsCalculator.calculateDueDate(
      filedAt,
      caseType.defaultLegalTermDays
    );

    // 5. Determinar prioridad final
    const citizen = await client.citizen.findUnique({
      where: { id: input.citizenId },
    });

    let finalPriority = input.priority || 40; // Normal = 40
    let finalPriorityReason = input.priorityReason;

    // Si el ciudadano es prioritario constitucionalmente, elevar prioridad
    if (citizen?.isPriorityGroup && finalPriority === 40) {
      finalPriority = 60; // Alto = 60
      finalPriorityReason = citizen.priorityReason || 'Sujeto de especial protección constitucional';
    }

    // 6. Crear el caso
    const newCase = await client.case.create({
      data: {
        tenantId: input.tenantId,
        citizenId: input.citizenId,
        caseTypeId: caseType.id,
        stateId: initialState.id,
        filingNumber,
        subject: input.subject,
        description: input.description,
        folios: input.folios,
        channel: input.channel,
        priority: finalPriority,
        priorityReason: finalPriorityReason,
        filedAt,
        dueDate,
        legalTermDays: caseType.defaultLegalTermDays,
        metadata: (input.metadata || {}) as object,
      },
      include: {
        citizen: true,
        caseType: true,
        state: true,
      },
    });

    // 7. Crear registro de historial de estado
    await client.caseStateHistory.create({
      data: {
        tenantId: input.tenantId,
        caseId: newCase.id,
        fromStateId: null,
        toStateId: initialState.id,
        comment: `Caso radicado a través de canal ${input.channel}`,
        reason: 'INITIAL',
      },
    });

    return newCase;
  }

  /**
   * Genera un número de radicación único POR TENANT
   * 
   * Formato: {SIGLA}-{YYYY}-{NNNNNN}
   * SIGLA = Sigla del tenant (ej: ENTIDAD, PMXY)
   * YYYY = Año actual
   * NNNNNN = Consecutivo secuencial de 6 dígitos por tenant
   * 
   * Ejemplo: ENTIDAD-2026-000001, PMXY-2026-000001
   */
  async generateFilingNumber(tenantId: string, db?: PrismaClient): Promise<string> {
    const client = db || prisma;
    // Obtener la sigla del tenant desde la BD principal (siempre está ahí)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { sigla: true },
    });

    const sigla = tenant?.sigla || 'VU';
    const year = new Date().getFullYear();
    const prefix = `${sigla}-${year}-`;

    const lastCase = await client.case.findFirst({
      where: {
        tenantId,
        filingNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        filingNumber: 'desc',
      },
    });

    let nextNumber = 1;

    if (lastCase) {
      // Extraer el número del último radicado (último segmento después del último guión)
      const parts = lastCase.filingNumber.split('-');
      const lastNumber = parts[parts.length - 1];
      nextNumber = parseInt(lastNumber, 10) + 1;
    }

    // Formatear con 6 dígitos (padding con ceros)
    const formattedNumber = nextNumber.toString().padStart(6, '0');

    return `${prefix}${formattedNumber}`;
  }

  /**
   * Obtiene un tipo de caso por su código
   */
  async getCaseTypeByCode(code: string, tenantId?: string, db?: PrismaClient) {
    const client = db || prisma;
    if (tenantId) {
      return await client.caseType.findFirst({
        where: {
          tenantId,
          OR: [
            { code },
            { code: { startsWith: `${code}_` } }
          ]
        },
      });
    }
    // `code` ya no es único global (ahora @@unique([code, tenantId])); sin tenant
    // se devuelve la primera coincidencia por código.
    return await client.caseType.findFirst({
      where: { code },
    });
  }

  async getStateByCode(code: string, db?: PrismaClient) {
    return await (db || prisma).caseState.findUnique({
      where: { code },
    });
  }

  /**
   * Busca un caso por número de radicación
   */
  async findByFilingNumber(filingNumber: string, tenantId: string) {
    return await prisma.case.findFirst({
      where: { filingNumber, tenantId },
      include: {
        citizen: true,
        caseType: true,
        state: true,
      },
    });
  }

  /**
   * Busca un caso por ID
   */
  async findById(id: string, tenantId: string) {
    return await prisma.case.findFirst({
      where: { id, tenantId },
      include: {
        citizen: true,
        caseType: true,
        state: true,
      },
    });
  }

  /**
   * Obtiene todos los casos de un ciudadano
   */
  async getCasesByCitizen(citizenId: string, tenantId: string) {
    return await prisma.case.findMany({
      where: { citizenId, tenantId },
      include: {
        caseType: true,
        state: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Calcula el estado del semáforo de un caso
   * Verde: < 50% del término
   * Amarillo: 50-80% del término
   * Rojo: > 80% del término o vencido
   */
  async calculateCaseStatus(caseId: string, tenantId: string) {
    const caseData = await this.findById(caseId, tenantId);
    if (!caseData) {
      throw new Error('Caso no encontrado');
    }

    return LegalTermsCalculator.getTermInfo(
      caseData.filedAt,
      caseData.dueDate,
      caseData.legalTermDays
    );
  }

  /**
   * Obtiene estadísticas generales de casos
   * Útil para dashboard futuro
   */
  async getStats(tenantId: string) {
    const total = await prisma.case.count({ where: { tenantId } });

    const byType = await prisma.case.groupBy({
      by: ['caseTypeId'],
      where: { tenantId },
      _count: true,
    });

    const byState = await prisma.case.groupBy({
      by: ['stateId'],
      where: { tenantId },
      _count: true,
    });

    const byPriority = await prisma.case.groupBy({
      by: ['priority'],
      where: { tenantId },
      _count: true,
    });

    const byChannel = await prisma.case.groupBy({
      by: ['channel'],
      where: { tenantId },
      _count: true,
    });

    return {
      total,
      byType,
      byState,
      byPriority,
      byChannel,
    };
  }

  /**
   * Lista casos con paginación y filtros
   */
  async list(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    typeCode?: string;
    stateCode?: string;
    priority?: number;
    channel?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: {
      tenantId: string;
      caseTypeId?: string;
      stateId?: string;
      priority?: number;
      channel?: Channel;
    } = { tenantId: params.tenantId };

    if (params.typeCode) {
      const type = await this.getCaseTypeByCode(params.typeCode, params.tenantId);
      if (type) where.caseTypeId = type.id;
    }

    if (params.stateCode) {
      const state = await this.getStateByCode(params.stateCode);
      if (state) where.stateId = state.id;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.channel) {
      where.channel = params.channel as Channel;
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          citizen: true,
          caseType: true,
          state: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.case.count({ where }),
    ]);

    return {
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Singleton
export const caseService = new CaseService();

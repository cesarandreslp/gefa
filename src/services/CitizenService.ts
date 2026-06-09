/**
 * CitizenService - Servicio para gestión de ciudadanos
 * 
 * Responsabilidades:
 * - Buscar o crear ciudadanos
 * - Validar documentos de identidad
 * - Actualizar información de contacto
 * - Gestionar consentimientos de datos personales
 * 
 * Cumplimiento normativo:
 * - Ley 1581 de 2012 (Habeas Data)
 * - Ley 1712 de 2014 (Transparencia)
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface CreateCitizenInput {
  tenantId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  department?: string;
  dataConsent: boolean;
  dataConsentDate: Date;
  dataConsentIp: string;
  isAnonymous?: boolean;
}

export interface FindOrCreateResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  citizen: any;
  isNew: boolean;
}

export class CitizenService {
  /**
   * Busca un ciudadano por tipo y número de documento
   */
  async findByDocument(documentType: string, documentNumber: string, tenantId: string, db?: PrismaClient) {
    return await (db || prisma).citizen.findFirst({
      where: {
        documentType,
        documentNumber,
        tenantId,
      },
    });
  }

  /**
   * Busca un ciudadano por email
   */
  async findByEmail(email: string, tenantId: string, db?: PrismaClient) {
    return await (db || prisma).citizen.findFirst({
      where: { email, tenantId },
    });
  }

  /**
   * Crea un nuevo ciudadano
   * Valida que no exista duplicado por documento
   */
  async create(input: CreateCitizenInput) {
    // Verificar que no exista
    const existing = await this.findByDocument(input.documentType, input.documentNumber, input.tenantId);
    if (existing) {
      throw new Error('El ciudadano ya está registrado con ese documento');
    }

    // Verificar email si se proporciona
    if (input.email) {
      const existingEmail = await this.findByEmail(input.email, input.tenantId);
      if (existingEmail) {
        throw new Error('El email ya está registrado');
      }
    }

    return await prisma.citizen.create({
      data: {
        tenantId: input.tenantId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        firstName: input.firstName,
        firstLastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        neighborhood: input.neighborhood,
        city: input.city || '',
        department: input.department || '',
        dataConsent: input.dataConsent,
        dataConsentDate: input.dataConsentDate,
        isAnonymous: input.isAnonymous || false,
      },
    });
  }

  /**
   * Busca o crea un ciudadano
   * Patrón común: si existe, retorna el existente; si no, crea uno nuevo
   * 
   * IMPORTANTE: Si el ciudadano existe pero no tiene consentimiento,
   * se actualiza con el nuevo consentimiento
   */
  async findOrCreate(input: CreateCitizenInput, db?: PrismaClient): Promise<FindOrCreateResult> {
    const client = db || prisma;
    // Si es anónimo siempre crear uno nuevo para evitar conflictos de ID o reutilizar historial
    if (input.isAnonymous) {
      const newCitizen = await client.citizen.create({
        data: {
          tenantId: input.tenantId,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          firstName: input.firstName,
          firstLastName: input.lastName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          neighborhood: input.neighborhood,
          city: input.city || '',
          department: input.department || '',
          dataConsent: input.dataConsent,
          dataConsentDate: input.dataConsentDate,
          isAnonymous: true,
        },
      });
      return { citizen: newCitizen, isNew: true };
    }

    // Primero buscar por documento
    let existing = await this.findByDocument(input.documentType, input.documentNumber, input.tenantId, client);

    // Si no existe por documento, verificar por email
    if (!existing && input.email) {
      existing = await this.findByEmail(input.email, input.tenantId, client);
    }

    if (existing) {
      // Actualizar nombre, datos de contacto y consentimiento
      const updatedCitizen = await client.citizen.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName || existing.firstName,
          firstLastName: input.lastName || existing.firstLastName,
          email: input.email || existing.email,
          phone: input.phone || existing.phone,
          address: input.address || existing.address,
          neighborhood: input.neighborhood || existing.neighborhood,
          city: input.city || existing.city,
          department: input.department || existing.department,
          dataConsent: input.dataConsent || existing.dataConsent,
          dataConsentDate: input.dataConsentDate || existing.dataConsentDate,
        },
      });

      return {
        citizen: updatedCitizen,
        isNew: false,
      };
    }

    // No existe ni por documento ni por email, crear nuevo
    const newCitizen = await client.citizen.create({
      data: {
        tenantId: input.tenantId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        firstName: input.firstName,
        firstLastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        neighborhood: input.neighborhood,
        city: input.city || '',
        department: input.department || '',
        dataConsent: input.dataConsent,
        dataConsentDate: input.dataConsentDate,
        isAnonymous: false,
      },
    });

    return {
      citizen: newCitizen,
      isNew: true,
    };
  }

  /**
   * Actualiza información de contacto de un ciudadano
   */
  async updateContact(
    citizenId: string,
    tenantId: string,
    data: {
      email?: string;
      phone?: string;
      address?: string;
      neighborhood?: string;
      city?: string;
      department?: string;
    }
  ) {
    return await prisma.citizen.updateMany({
      where: { id: citizenId, tenantId },
      data,
    });
  }

  /**
   * Registra un nuevo consentimiento de datos personales
   * Usado cuando el ciudadano acepta política de privacidad
   */
  async updateDataConsent(citizenId: string, tenantId: string) {
    return await prisma.citizen.updateMany({
      where: { id: citizenId, tenantId },
      data: {
        dataConsent: true,
        dataConsentDate: new Date(),
      },
    });
  }

  /**
   * Obtiene todos los casos de un ciudadano
   */
  async getCases(citizenId: string, tenantId: string) {
    return await prisma.case.findMany({
      where: { citizenId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        caseType: true,
        state: true,
      },
    });
  }

  /**
   * Valida si un tipo de documento es válido
   */
  validateDocumentType(type: string): boolean {
    const validTypes = ['CC', 'TI', 'CE', 'PA', 'RC', 'NIT'];
    return validTypes.includes(type);
  }

  /**
   * Determina si un ciudadano es prioritario según criterios constitucionales
   * Arts. 13, 44, 46, 47 de la Constitución Política
   */
  determinePriority(data: {
    age?: number;
    isMinor?: boolean;
    isElderly?: boolean;
    hasDisability?: boolean;
    isVictim?: boolean;
    isPregnant?: boolean;
  }): { isPriority: boolean; reason?: string } {
    const reasons = [];

    if (data.isMinor || (data.age && data.age < 18)) {
      reasons.push('Menor de edad (Art. 44 CP)');
    }

    if (data.isElderly || (data.age && data.age >= 60)) {
      reasons.push('Adulto mayor (Art. 46 CP)');
    }

    if (data.hasDisability) {
      reasons.push('Persona con discapacidad (Art. 47 CP)');
    }

    if (data.isVictim) {
      reasons.push('Víctima del conflicto (Ley 1448/2011)');
    }

    if (data.isPregnant) {
      reasons.push('Mujer gestante (Art. 43 CP)');
    }

    return {
      isPriority: reasons.length > 0,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    };
  }
}

// Singleton
export const citizenService = new CitizenService();

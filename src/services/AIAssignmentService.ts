/**
 * AIAssignmentService - Sistema de Asignación Inteligente
 * 
 * Servicio que utiliza IA (Groq) para analizar solicitudes ciudadanas
 * y asignarlas automáticamente al funcionario más apropiado según su
 * tipo/especialidad (userType), no por su rol.
 * 
 * ARQUITECTURA:
 * - Roles: ADMIN, REVISOR, FUNCIONARIO
 * - Tipos de Usuario: Especialidades dentro del rol FUNCIONARIO
 *   Ejemplo: "Dependencia de Hacienda", "Director Administrativo", etc.
 * 
 * La IA busca entre usuarios con rol FUNCIONARIO o REVISOR
 * y decide según el userType y userTypeDescription.
 */

import Groq from 'groq-sdk';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assignmentService } from './AssignmentService';

// Cache de clientes Groq por API key (lazy-loaded para que Vercel no falle durante el build)
const _groqClients = new Map<string, Groq>();

function getGroqClient(apiKey?: string | null): Groq {
  const key = apiKey || process.env.GROQ_API_KEY || 'dummy-key-for-build';
  if (!_groqClients.has(key)) {
    _groqClients.set(key, new Groq({ apiKey: key }));
  }
  return _groqClients.get(key)!;
}

export interface AIAnalysisResult {
  recommendedUserType: string;
  recommendedUserId?: string;
  confidence: number;
  reasoning: string;
  matchedKeywords: string[];
  alternativeUserTypes?: Array<{
    userType: string;
    confidence: number;
  }>;
}

interface UserTypeInfo {
  userId: string;
  email: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  roleLevel: number;
  userType: string;
  userTypeDescription: string;
  currentCaseLoad: number;
  maxCaseLoad: number;
}

export class AIAssignmentService {
  /**
   * Obtiene todos los funcionarios activos que pueden recibir asignaciones.
   * Incluye: FUNCIONARIO (nivel 85) y DIRECTOR (nivel 100, código 'DIRECTOR') como autoridad máxima.
   * Excluye: ADMIN, ASIGNACION_DE_CASOS, VENTANILLA_UNICA, AUXILIAR_ATENCION_USUARIO.
   */
  private async getAvailableFuncionarios(tenantId: string, db?: PrismaClient): Promise<UserTypeInfo[]> {
    const client = db || prisma;
    const users = await client.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: {
          OR: [
            { level: 85 }, // FUNCIONARIO
            { code: 'DIRECTOR' }, // Director como autoridad principal / fallback de la IA
          ],
        },
      },
      include: {
        role: true,
        assignments: {
          where: {
            status: {
              in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS']
            }
          }
        }
      },
      orderBy: [
        { role: { level: 'desc' } }, // Director primero (nivel 100)
        { fullName: 'asc' }
      ]
    });

    // Obtener descripciones de los cargos definidos en la tabla Position
    // Usamos queryRaw porque el cliente Prisma fue generado antes de añadir la columna description
    const positionNames = users
      .filter(u => !!u.position)
      .map(u => u.position as string);
    const positionDescriptions: Array<{ name: string; description: string | null }> =
      positionNames.length > 0
        ? await client.$queryRaw`
            SELECT name, description
            FROM positions
            WHERE "tenantId" = ${tenantId}
              AND name = ANY(${positionNames}::text[])
          `
        : [];
    const descriptionMap = new Map(
      positionDescriptions.map(p => [p.name, p.description])
    );

    // Solo se incluyen usuarios con cargo (position) explícitamente asignado.
    // Un usuario sin position no tiene especialidad definida y no debe recibir asignaciones por IA.
    // Excepción: el Director siempre se incluye aunque no tenga position (usa su nombre de rol).
    return users
      .filter(user => {
        const isDirector = user.role?.code === 'DIRECTOR';
        return isDirector || !!user.position;
      })
      .map(user => {
        const cargo = user.position || user.role?.name || 'Director';
        const cargoDescription = user.position ? descriptionMap.get(user.position) ?? null : null;

        return {
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          roleCode: user.role?.code || '',
          roleName: user.role?.name || '',
          roleLevel: user.role?.level || 0,
          userType: cargo,
          userTypeDescription: cargoDescription || cargo,
          currentCaseLoad: user.assignments.length,
          maxCaseLoad: user.maxCaseLoad,
        };
    });
  }

  /**
   * Analiza una solicitud y recomienda el funcionario más apropiado usando IA
   */
  async analyzeCase(caseData: {
    tenantId: string;
    subject: string;
    description: string;
    caseType?: string;
    excludeUserId?: string;
    db?: PrismaClient;
  }): Promise<AIAnalysisResult> {
    const client = caseData.db || prisma;
    try {
      let availableFuncionarios = await this.getAvailableFuncionarios(caseData.tenantId, client);

      // Excluir funcionario si se solicita (ej: el que pide reasignación)
      if (caseData.excludeUserId) {
        availableFuncionarios = availableFuncionarios.filter(
          f => f.userId !== caseData.excludeUserId
        );
      }

      if (availableFuncionarios.length === 0) {
        throw new Error('No hay funcionarios disponibles para asignación');
      }

      // Obtener API key del tenant (fallback a la global)
      const tenantSettings = await prisma.tenantSettings.findUnique({
        where: { tenantId: caseData.tenantId },
        select: { groqApiKey: true },
      });

      // Construir el prompt para la IA con funcionarios actuales
      const systemPrompt = this.buildSystemPrompt(availableFuncionarios);
      const userPrompt = this.buildUserPrompt(caseData);

      // Llamar a Groq API
      const groq = getGroqClient(tenantSettings?.groqApiKey);
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No se recibió respuesta de la IA');
      }

      const analysis = JSON.parse(responseContent);

      // ── Validación 1: el cargo recomendado aparece en la lista en memoria ──
      const funcionarioMatch = availableFuncionarios.find(
        func => func.userType === analysis.recommendedUserType
      );

      // Helper para obtener el fallback al Director
      const getDirectorFallback = (reason: string) => {
        const directorFallback = availableFuncionarios.find(
          func => func.roleCode === 'DIRECTOR'
        );
        if (!directorFallback) {
          throw new Error(`Cargo recomendado no disponible y no hay Director activo: ${reason}`);
        }
        return {
          recommendedUserType: directorFallback.userType,
          recommendedUserId: directorFallback.userId,
          confidence: 0.7,
          reasoning: `${reason} Asignando al Director como autoridad principal.`,
          matchedKeywords: analysis.matchedKeywords || [],
          alternativeUserTypes: [],
        };
      };

      if (!funcionarioMatch) {
        return getDirectorFallback(
          `El cargo recomendado (${analysis.recommendedUserType}) no existe en la BD o no tiene usuario asignado.`
        );
      }

      // ── Validación 2: verificar en BD que el usuario sigue activo y tiene el cargo asignado ──
      const usuarioVerificado = await client.user.findFirst({
        where: {
          id: funcionarioMatch.userId,
          tenantId: caseData.tenantId,
          isActive: true,
          position: funcionarioMatch.userType,
        },
      });

      if (!usuarioVerificado) {
        console.warn(
          `⚠️ [IA] El usuario ${funcionarioMatch.userId} (cargo: ${funcionarioMatch.userType}) ` +
          `ya no está activo o no tiene ese cargo asignado en BD. Usando Director como fallback.`
        );
        return getDirectorFallback(
          `El usuario asignado al cargo "${funcionarioMatch.userType}" ya no está disponible en BD.`
        );
      }

      return {
        recommendedUserType: funcionarioMatch.userType,
        recommendedUserId: usuarioVerificado.id,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        matchedKeywords: analysis.matchedKeywords || [],
        alternativeUserTypes: analysis.alternativeUserTypes || [],
      };
    } catch (error) {
      console.error('Error en análisis de IA:', error);
      throw error;
    }
  }

  /**
   * Asigna automáticamente un caso basándose en el análisis de IA
   */
  async autoAssignCase(params: {
    tenantId: string;
    caseId: string;
    aiUserId: string;
    aiUserEmail: string;
    ipAddress: string;
    userAgent: string;
    db?: PrismaClient;
  }): Promise<{
    success: boolean;
    analysis?: AIAnalysisResult;
    assignment?: {
      id: string;
      caseId: string;
      userId: string;
      assignedAt: Date;
      isReassignment: boolean;
    };
    error?: string;
  }> {
    const client = params.db || prisma;
    try {
      // 1. Obtener el caso de la base de datos
      const caseData = await client.case.findFirst({
        where: { id: params.caseId, tenantId: params.tenantId },
        include: {
          caseType: true,
          citizen: true,
        },
      });

      if (!caseData) {
        return {
          success: false,
          error: 'Caso no encontrado',
        };
      }

      // 2. Notificar a VU SIEMPRE, antes del análisis de IA.
      // Usar insert directo para no marcar asignaciones previas como REASSIGNED.
      const ventanillaUsers = await client.user.findMany({
        where: {
          tenantId: params.tenantId,
          role: { code: 'VENTANILLA_UNICA' },
          isActive: true,
        },
      });
      for (const vUser of ventanillaUsers) {
        try {
          await client.assignment.create({
            data: {
              tenantId: params.tenantId,
              caseId: params.caseId,
              userId: vUser.id,
              assignedBy: params.aiUserId,
              status: 'PENDING',
              notes: 'Nuevo caso recibido — pendiente de clasificación VU',
            },
          });
          console.log(`✅ Caso notificado a Ventanilla Única: ${vUser.email}`);
        } catch (vError) {
          console.warn(`⚠️ No se pudo notificar a Ventanilla Única ${vUser.email}:`, vError);
        }
      }

      // 3. Analizar con IA
      const analysis = await this.analyzeCase({
        tenantId: params.tenantId,
        subject: caseData.subject,
        description: caseData.description || '',
        caseType: caseData.caseType?.name,
        db: client,
      });

      // 4. Verificar que el usuario recomendado existe y está activo
      if (!analysis.recommendedUserId) {
        return {
          success: false,
          error: `No se pudo determinar un usuario para el tipo: ${analysis.recommendedUserType}`,
          analysis,
        };
      }

      const targetUser = await client.user.findFirst({
        where: { id: analysis.recommendedUserId, tenantId: params.tenantId },
        include: { role: true },
      });

      if (!targetUser || !targetUser.isActive) {
        return {
          success: false,
          error: `El usuario recomendado no está disponible: ${analysis.recommendedUserType}`,
          analysis,
        };
      }

      // 5. Asignar el caso usando el servicio existente
      const assignmentResult = await assignmentService.assignCase({
        tenantId: params.tenantId,
        caseId: params.caseId,
        newAssigneeId: targetUser.id,
        assignedByUserId: params.aiUserId,
        assignedByEmail: params.aiUserEmail,
        assignedByRole: 'ASIGNACION_DE_CASOS',
        reason: `Asignación automática por IA a ${targetUser.userType}. ${analysis.reasoning}. Confianza: ${(analysis.confidence * 100).toFixed(0)}%`,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        db: client,
      });

      if (!assignmentResult.success) {
        return {
          success: false,
          error: assignmentResult.error,
          analysis,
        };
      }

      // 6. Notificar al funcionario asignado por email
      try {
        const { NotificationHooks } = await import('./NotificationHooks');
        await NotificationHooks.onCaseAssigned({
          caseId: params.caseId,
          filingNumber: caseData.filingNumber,
          userId: targetUser.id,
          userName: targetUser.fullName || targetUser.email,
          userEmail: targetUser.email,
          citizenName: caseData.citizen ? `${caseData.citizen.firstName} ${caseData.citizen.firstLastName}` : 'Ciudadano',
          caseType: caseData.caseType?.name || 'General',
          dueDate: caseData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          tenantId: params.tenantId,
        });
        console.log(`📧 Notificación de asignación enviada a ${targetUser.email}`);
      } catch (notifError) {
        console.error('⚠️ Error enviando notificación de asignación (no crítico):', notifError);
      }

      return {
        success: true,
        analysis,
        assignment: assignmentResult.assignment,
      };
    } catch (error) {
      console.error('Error en asignación automática:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Construye el prompt del sistema para la IA con funcionarios dinámicos
   */
  private buildSystemPrompt(availableFuncionarios: UserTypeInfo[]): string {
    // Identificar al Director (autoridad principal / fallback de la IA)
    const directorFunc = availableFuncionarios.find(func => func.roleCode === 'DIRECTOR');

    // Construir información de funcionarios disponibles
    const funcionariosInfo = availableFuncionarios
      .map((func) => {
        const priority = func.roleCode === 'DIRECTOR'
          ? 'MÁXIMA AUTORIDAD - Director (fallback para casos críticos y alta complejidad)'
          : `Funcionario especializado (carga actual: ${func.currentCaseLoad}/${func.maxCaseLoad})`;

        // Solo mostrar descripción adicional si es diferente del nombre del cargo (es decir, el admin la escribió)
        const hasCustomDescription = func.userTypeDescription !== func.userType;

        return `
**${func.userType}**
Funcionario: ${func.fullName}
Rol: ${func.roleName} (Nivel ${func.roleLevel})
Prioridad: ${priority}
${hasCustomDescription ? `Descripción del cargo: ${func.userTypeDescription}` : ''}
Carga de trabajo: ${func.currentCaseLoad} de ${func.maxCaseLoad} casos
${func.currentCaseLoad >= func.maxCaseLoad ? '⚠️ CARGA COMPLETA - Solo asignar si es estrictamente necesario' : '✓ Disponible para nuevos casos'}
`;
      })
      .join('\n');

    return `Eres un asistente de IA especializado en asignar trámites en una Entidad Pública estatal.

Tu tarea es analizar solicitudes ciudadanas y recomendar el FUNCIONARIO más apropiado para atender cada caso basándote en el nombre de su CARGO (userType), NO en su rol genérico.

**IMPORTANTE - ARQUITECTURA DEL SISTEMA:**
- El sistema tiene ROLES principales: ADMIN, DIRECTOR, FUNCIONARIO, VENTANILLA_UNICA
- Dentro del rol FUNCIONARIO hay múltiples CARGOS con especialidades diferentes
- El DIRECTOR es la autoridad máxima y fallback para casos críticos o complejos
- La IA debe asignar según las competencias implícitas en el nombre del CARGO, no según el ROL

**CARGOS (FUNCIONARIOS) DISPONIBLES ACTUALMENTE:**
${funcionariosInfo}

**REGLAS CRÍTICAS DE ASIGNACIÓN:**

1. **AUTORIDAD PRINCIPAL (DIRECTOR)**
   ${directorFunc ? `
   - Cargo: ${directorFunc.userType}
   - Funcionario: ${directorFunc.fullName}
   ` : ''}
   - TODAS las acciones de tutela deben asignarse a la autoridad principal
   - Casos de vulneración grave de derechos fundamentales
   - Asuntos de alto impacto institucional o mediático
   - Denuncias graves o abuso de autoridad
   - Casos de extrema complejidad

2. **CASOS COMPLEJOS O AMBIGUOS → AUTORIDAD PRINCIPAL**
   - Cuando hay duda entre múltiples competencias
   - Cuando el caso involucra varias áreas simultáneamente
   - Cuando la confianza es menor a 0.6
   - Cuando ningún CARGO especializado tiene competencia clara

3. **CARGOS ESPECIALIZADOS (FUNCIONARIOS / DELEGADOS)**
   - Asigna a los funcionarios especializados siempre que el caso encaje razonablemente en las funciones implícitas de su nombre de cargo
   - Confianza sugerida: 0.6 o más para asignar a funcionarios especializados
   - Analiza el nombre completo de cada cargo ("userType") detalladamente. El nombre del cargo dicta su área de jurisdicción.
   - Considera la carga de trabajo actual: prefiere funcionarios con menos casos si la temática aplica a varios

4. **PROCESO DE DECISIÓN:**
   - Lee cuidadosamente el asunto y descripción del caso
   - Analiza los CARGOS de TODOS los funcionarios disponibles
   - Identifica palabras clave y temática principal
   - Si es acción de tutela o tema crítico/grave → Asigna a la Autoridad Principal
   - Para solicitudes generales (peticiones, quejas, reclamos) → Asigna al funcionario cuyo CARGO corresponda a la temática
   - Asigna nivel de confianza según claridad de coincidencia

**INSTRUCCIONES:**
1. Analiza el contenido del caso (asunto + descripción)
2. Compara el caso con los nombres de los CARGOS de los funcionarios disponibles
3. Selecciona el funcionario cuyo CARGO mejor coincida con el caso
4. Si el caso es de altísima complejidad o es una tutela, asigna a la autoridad principal
5. Proporciona razonamiento claro de tu decisión basándote en el nombre del cargo
6. Indica qué palabras clave encontraste relevantes
7. Retorna el nombre EXACTO del cargo (userType) seleccionado

**FORMATO DE RESPUESTA (JSON):**
{
  "recommendedUserType": "NOMBRE_EXACTO_DEL_CARGO",
  "confidence": 0.85,
  "reasoning": "La solicitud trata sobre X, lo cual corresponde directamente con las funciones del cargo Y",
  "matchedKeywords": ["palabra1", "palabra2"],
  "alternativeUserTypes": [
    {
      "userType": "NOMBRE_CARGO_ALTERNATIVO",
      "confidence": 0.60
    }
  ]
}

**CRITERIOS DE CONFIANZA:**
- 0.8 - 1.0: Coincidencia muy clara con el nombre del cargo (o Tutela para Autoridad)
- 0.6 - 0.79: Coincidencia razonable, el caso aplica a las funciones generales del cargo
- 0.0 - 0.59: Confianza baja → Enviar a la autoridad principal para que revise y asigne manualmente

**EJEMPLOS:**
- "Tutela para medicamento" → ${directorFunc ? directorFunc.userType : 'Director'} (confidence: 1.0)
- "Problema con cita EPS" → Funcionario de Salud (confidence: 0.85)
- "Basuras en la vía pública" → Funcionario de Medio Ambiente (confidence: 0.8)
- "Queja contra policía" → Funcionario de Conducta Oficial o DDHH (confidence: 0.75)
- "Solicito información general" → Funcionario general administrativo (confidence: 0.65)

**RECUERDA**: 
- Debes retornar el userType EXACTO tal como aparece en la lista de FUNCIONARIOS DISPONIBLES ACTUALMENTE
- NO inventes tipos de usuario que no existen en la lista proveida
- Favorece la asignación a funcionarios especializados para descentralizar el trabajo
- Solo si no hay coincidencia razonable, asigna a la autoridad principal (${directorFunc ? directorFunc.userType : 'Director'})`;
  }

  /**
   * Construye el prompt del usuario con los datos del caso
   */
  private buildUserPrompt(caseData: {
    subject: string;
    description: string;
    caseType?: string;
  }): string {
    return `Analiza la siguiente solicitud ciudadana y recomienda el funcionario más apropiado:

**ASUNTO:** ${caseData.subject}

**DESCRIPCIÓN:** ${caseData.description}

${caseData.caseType ? `**TIPO DE CASO:** ${caseData.caseType}` : ''}

Proporciona tu análisis en formato JSON según las instrucciones.`;
  }

  /**
   * Obtiene estadísticas de asignaciones automáticas
   */
  async getAssignmentStats(): Promise<{
    totalAssignments: number;
    byRole: Record<string, number>;
    averageConfidence: number;
    successRate: number;
  }> {
    // TODO: Implementar tracking de asignaciones automáticas en una tabla específica
    // Cuando se implemente, agregar parámetros dateFrom?: Date, dateTo?: Date
    return {
      totalAssignments: 0,
      byRole: {},
      averageConfidence: 0,
      successRate: 0,
    };
  }
}

// Singleton
export const aiAssignmentService = new AIAssignmentService();

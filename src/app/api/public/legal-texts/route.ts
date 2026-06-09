/**
 * API ENDPOINT: GET /api/public/legal-texts
 * 
 * Obtiene los textos legales configurados en el sistema
 * 
 * Acceso: PÚBLICO
 * Cache: 24 horas
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { NextResponse } from 'next/server';
import { SystemSettingsService } from '@/services/SystemSettingsService';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 horas

export async function GET() {
  try {
    // Obtener textos legales desde SystemSettings
    const legalTexts = await SystemSettingsService.getSetting('LEGAL_TEXTS');

    return NextResponse.json({
      success: true,
      data: legalTexts,
    });
  } catch (error) {
    console.error('Error al obtener textos legales:', error);
    
    // Retornar valores por defecto en caso de error
    return NextResponse.json({
      success: true,
      data: {
        privacyPolicy: '',
        termsAndConditions: '',
        transparencyNote: 'En cumplimiento de la Ley 1712 de 2014.',
      },
    });
  }
}

/**
 * Resolver del PRELLENADO de instrumentos (RF‑02).
 * Función pura: dado el mapa de campos canónicos, los códigos de campo de un
 * instrumento y los datos del caso (partes + radicante + violencia), produce
 * `{ campoCode: valor }` con lo que ya consta en el expediente. No escribe nada.
 */

import {
  INSTRUMENTO_PREFILL_MAP,
  type PrefillSource,
  type PartyRoleKey,
  type PersonField,
} from '@/domain/catalogs/instrumentoFieldMap';

export interface PrefillPerson {
  documentType?: string | null;
  documentNumber?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  birthDate?: Date | string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  neighborhood?: string | null;
}

export interface PrefillCase {
  caseParties: Array<{ role: string; person: PrefillPerson | null }>;
  citizen?: PrefillPerson | null;
  violenceTypes?: string[] | null;
}

type PrefillValue = string | number;

function fullName(p: PrefillPerson): string {
  return [p.firstName, p.secondName, p.firstLastName, p.secondLastName].filter(Boolean).join(' ').trim();
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function dateISO(v: Date | string | null | undefined): string {
  const d = toDate(v);
  return d ? d.toISOString().slice(0, 10) : '';
}

function ageFrom(v: Date | string | null | undefined): number | '' {
  const d = toDate(v);
  if (!d) return '';
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years >= 0 && years < 130 ? years : '';
}

// documentType de Person (CC/CE/TI/RC/PA/PEP/PPT) → opciones del formato.
function docTypeCaracterizacion(dt: string): string {
  switch (dt) {
    case 'CC': case 'CE': case 'TI': return dt;
    case 'PA': case 'PAS': return 'PAS';
    case 'PEP': case 'PPT': return 'PEP';
    default: return 'OTRO';
  }
}
function docTypeAgresor(dt: string): string {
  switch (dt) {
    case 'CC': case 'CE': case 'TI': return dt;
    default: return 'OTRO';
  }
}
function sexo(gender: string): string {
  switch (gender) {
    case 'M': case 'HOMBRE': return 'HOMBRE';
    case 'F': case 'MUJER': return 'MUJER';
    default: return '';
  }
}

function readField(person: PrefillPerson, field: PersonField, transform?: string): PrefillValue | '' {
  const raw = person[field];
  if (raw == null || raw === '') {
    // birthDate puede venir como Date aun "vacío" no aplica; ya cubierto por null.
    if (transform !== 'dateISO' && transform !== 'age') return '';
  }
  switch (transform) {
    case 'dateISO': return dateISO(person.birthDate);
    case 'age': return ageFrom(person.birthDate);
    case 'docTypeCaracterizacion': return raw ? docTypeCaracterizacion(String(raw)) : '';
    case 'docTypeAgresor': return raw ? docTypeAgresor(String(raw)) : '';
    case 'sexo': return raw ? sexo(String(raw)) : '';
    default: return raw == null ? '' : String(raw);
  }
}

/**
 * Resuelve los valores de prellenado para los `campoCodes` dados.
 * Devuelve solo los campos con valor (omite vacíos para no pisar el formulario).
 */
export function resolveInstrumentoPrefill(
  campoCodes: string[],
  caseData: PrefillCase
): Record<string, PrefillValue> {
  const personByRole = (role: PartyRoleKey): PrefillPerson | null => {
    const party = caseData.caseParties.find((p) => p.role === role);
    if (party?.person) return party.person;
    // Fallback: la víctima puede ser el radicante (Citizen) si no hay parte VICTIMA.
    if (role === 'VICTIMA' && caseData.citizen) return caseData.citizen;
    return null;
  };

  const out: Record<string, PrefillValue> = {};

  for (const code of campoCodes) {
    const src: PrefillSource | undefined = INSTRUMENTO_PREFILL_MAP[code];
    if (!src) continue;

    let value: PrefillValue | '' = '';

    if (src.kind === 'violenceSingle') {
      const v = caseData.violenceTypes ?? [];
      value = v.length === 1 ? v[0] : v.length > 1 ? 'MULTIPLE' : '';
    } else {
      const person = personByRole(src.role);
      if (!person) continue;
      if (src.kind === 'fullName') value = fullName(person);
      else if (src.kind === 'age') value = ageFrom(person.birthDate);
      else value = readField(person, src.field, src.transform);
    }

    if (value !== '' && value != null) out[code] = value;
  }

  return out;
}

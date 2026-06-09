# 🚨 TUTELAS Y CASOS CRÍTICOS - Protocolo de Asignación

## ⚖️ REGLA DE ORO

**TODAS las acciones de tutela se asignan EXCLUSIVAMENTE al PERSONERO MUNICIPAL**

Las tutelas son mecanismos constitucionales de protección inmediata de derechos fundamentales que requieren la atención directa de la máxima autoridad de la Personería.

## 🎯 Casos que SIEMPRE van al Personero Municipal

### 1. Tutelas (Confianza: 1.0)
Cualquier solicitud que mencione:
- "tutela"
- "acción de tutela"
- "amparo constitucional"
- "perjuicio irremediable"
- "protección de derechos fundamentales"

**Ejemplos:**
```
✅ "Quiero interponer una tutela por negación de cirugía"
✅ "Necesito amparo constitucional para mi derecho a la salud"
✅ "Solicito acción de tutela contra la alcaldía"
✅ "Perjuicio irremediable por falta de medicamentos"
```

### 2. Denuncias Graves de Corrupción (Confianza: 0.9-1.0)
- Soborno de funcionarios públicos
- Peculado o malversación de fondos
- Abuso de autoridad con evidencia
- Casos de alto impacto institucional

**Ejemplos:**
```
✅ "Tengo evidencia de que el alcalde está recibiendo sobornos"
✅ "Funcionario pide dinero para aprobar trámites"
✅ "Desfalco en la alcaldía con documentos que lo prueban"
```

### 3. Casos Complejos o Multisectoriales (Confianza: <0.6)
- Descripción vaga o insuficiente
- Involucra múltiples áreas simultáneamente
- Requiere análisis especializado
- No hay coincidencia clara con delegados

**Ejemplos:**
```
✅ "Tengo un problema con la alcaldía pero no sé a quién acudir"
✅ "Situación compleja que involucra salud, medio ambiente y derechos humanos"
✅ "Necesito orientación sobre mi caso"
```

## 🔄 Casos que NO son Tutelas (van a Delegados)

### Salud sin Tutela → DELEGADA_RAMA_JUDICIAL_SALUD
```
✅ "La EPS no me entrega medicamentos recetados por el médico"
✅ "Negación de autorización de cirugía programada"
✅ "Solicito intervención para que EPS cumpla orden médica"
❌ "Quiero interponer tutela por medicamentos" → PERSONERO_MUNICIPAL
```

### Participación → DELEGADO_PARTICIPACION_CIUDADANA
```
✅ "Solicito audiencia pública sobre presupuesto"
✅ "Veeduría ciudadana sobre contratación"
✅ "Rendición de cuentas de la alcaldía"
```

### Servicios Públicos → DELEGADO_VIGILANCIA_CONDUCTA_OFICIAL
```
✅ "Queja por corte constante de energía eléctrica"
✅ "Problema con facturación del acueducto"
✅ "Irregularidades en contrato de aseo"
❌ "Denuncia de soborno en contratación" → PERSONERO_MUNICIPAL
```

### Medio Ambiente → DELEGADA_DDHH_MEDIO_AMBIENTE
```
✅ "Contaminación del río por empresa"
✅ "Tala ilegal de árboles en zona protegida"
✅ "Ruido excesivo de establecimiento comercial"
```

## 📊 Flujo de Decisión de la IA

```
┌─────────────────────────────────┐
│   Analizar solicitud ciudadana  │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ ¿Menciona "tutela"? │
    └─────┬──────────┬───┘
          │ SÍ       │ NO
          ▼          ▼
    ┌──────────┐  ┌─────────────────┐
    │ PERSONERO│  │ ¿Denuncia grave  │
    │ MUNICIPAL│  │  de corrupción?  │
    │ (1.0)    │  └─────┬──────┬────┘
    └──────────┘        │ SÍ   │ NO
                        ▼      ▼
                  ┌──────────┐ ┌──────────────┐
                  │ PERSONERO│ │ ¿Confianza   │
                  │ MUNICIPAL│ │   >= 0.7?    │
                  │ (0.95)   │ └──┬──────┬────┘
                  └──────────┘    │ SÍ   │ NO
                                  ▼      ▼
                            ┌────────┐ ┌──────────┐
                            │DELEGADO│ │ PERSONERO│
                            │ESPECÍF.│ │ MUNICIPAL│
                            └────────┘ └──────────┘
```

## 🔍 Indicadores para la IA

### Palabras Clave CRÍTICAS (Personero Municipal)
```javascript
const CRITICAL_KEYWORDS = [
  'tutela',
  'acción de tutela',
  'amparo constitucional',
  'perjuicio irremediable',
  'urgencia constitucional',
  'vulneración de derechos fundamentales',
  'soborno',
  'corrupción grave',
  'peculado',
  'abuso de autoridad',
  'denuncia grave',
  'alto impacto',
];
```

### Lógica de Decisión
```javascript
if (texto.includes('tutela')) {
  return {
    role: 'PERSONERO_MUNICIPAL',
    confidence: 1.0,
    reason: 'TUTELA DETECTADA - Asignación directa por normativa'
  };
}

if (denunciaGrave || corruption) {
  return {
    role: 'PERSONERO_MUNICIPAL',
    confidence: 0.95,
    reason: 'Caso de alto impacto institucional'
  };
}

if (confidence < 0.6) {
  return {
    role: 'PERSONERO_MUNICIPAL',
    confidence: 0.5,
    reason: 'Confianza insuficiente - Requiere clasificación experta'
  };
}
```

## 📋 Ejemplos Reales de Asignación

### Caso 1: Tutela Explícita
```json
{
  "input": {
    "subject": "Interponer tutela contra EPS",
    "description": "Solicito acción de tutela porque la EPS Sanitas me negó cirugía urgente..."
  },
  "output": {
    "recommendedRole": "PERSONERO_MUNICIPAL",
    "confidence": 1.0,
    "reasoning": "TUTELA EXPLÍCITA - Por normativa constitucional debe ser atendida por el Personero Municipal",
    "matchedKeywords": ["tutela", "acción de tutela"]
  }
}
```

### Caso 2: Tutela Implícita (Amparo)
```json
{
  "input": {
    "subject": "Amparo constitucional urgente",
    "description": "Necesito amparo de mis derechos fundamentales por perjuicio irremediable..."
  },
  "output": {
    "recommendedRole": "PERSONERO_MUNICIPAL",
    "confidence": 1.0,
    "reasoning": "Amparo constitucional = Tutela. Menciona perjuicio irremediable que es característica de tutelas urgentes",
    "matchedKeywords": ["amparo constitucional", "perjuicio irremediable"]
  }
}
```

### Caso 3: Salud SIN Tutela
```json
{
  "input": {
    "subject": "Solicitud de medicamentos",
    "description": "La EPS no me entrega los medicamentos que el médico recetó hace 2 semanas..."
  },
  "output": {
    "recommendedRole": "DELEGADA_RAMA_JUDICIAL_SALUD",
    "confidence": 0.85,
    "reasoning": "Caso de salud sin mención de tutela. Se trata de incumplimiento de EPS que puede resolver la Delegada",
    "matchedKeywords": ["EPS", "medicamentos", "salud"]
  }
}
```

### Caso 4: Corrupción Grave
```json
{
  "input": {
    "subject": "Denuncia de peculado en alcaldía",
    "description": "Tengo evidencia de que se desviaron fondos públicos del PAE. Adjunto documentos..."
  },
  "output": {
    "recommendedRole": "PERSONERO_MUNICIPAL",
    "confidence": 0.95,
    "reasoning": "Denuncia grave de peculado con evidencia documental. Alto impacto institucional requiere atención del Personero Municipal",
    "matchedKeywords": ["peculado", "denuncia grave", "fondos públicos"]
  }
}
```

### Caso 5: Caso Ambiguo
```json
{
  "input": {
    "subject": "Problema con la alcaldía",
    "description": "Necesito ayuda con un tema de la alcaldía"
  },
  "output": {
    "recommendedRole": "PERSONERO_MUNICIPAL",
    "confidence": 0.4,
    "reasoning": "Descripción insuficiente para determinar competencia. Se asigna al Personero Municipal para entrevista inicial y clasificación adecuada",
    "matchedKeywords": []
  }
}
```

## ⚠️ Casos Especiales

### Tutela + Salud
```
Entrada: "Tutela por negación de cirugía EPS"
Resultado: PERSONERO_MUNICIPAL (confidence: 1.0)
Razón: Presencia de "tutela" tiene prioridad absoluta
```

### Tutela + Medio Ambiente
```
Entrada: "Acción de tutela por contaminación del agua"
Resultado: PERSONERO_MUNICIPAL (confidence: 1.0)
Razón: Es una tutela, independiente del área temática
```

### Tutela + Cualquier Tema
```
Entrada: "Tutela + [cualquier tema]"
Resultado: SIEMPRE → PERSONERO_MUNICIPAL (confidence: 1.0)
```

## 📈 Métricas de Control

### Indicadores a Monitorear
1. **Tutelas correctamente identificadas:** 100%
2. **Casos graves escalados:** >= 95%
3. **Casos ambiguos al Personero:** >= 90%
4. **Falsos positivos de delegados:** < 5%

### Alertas del Sistema
- ⚠️ Si una tutela se asigna a un delegado → ERROR CRÍTICO
- ⚠️ Si denuncia grave va a delegado → Alerta inmediata
- ℹ️ Si confianza < 0.6 y no va a Personero → Revisión

## 🔐 Cumplimiento Normativo

### Fundamento Legal
- **Constitución Política de Colombia:** Artículo 86 (Acción de Tutela)
- **Ley 24 de 1992:** Organización y funcionamiento de las Personerías
- **Decreto 1 de 1984:** Código Contencioso Administrativo

### Competencia del Personero Municipal
El Personero Municipal es la máxima autoridad de control, vigilancia y defensa de los derechos humanos en el municipio. Las tutelas, por ser mecanismos constitucionales de protección de derechos fundamentales, **requieren su atención directa e inmediata**.

---

## ✅ Resumen Ejecutivo

| Tipo de Caso | Rol Asignado | Confianza | Fundamento |
|--------------|--------------|-----------|------------|
| **Tutela (explícita)** | PERSONERO_MUNICIPAL | 1.0 | Mandato constitucional |
| **Tutela (implícita)** | PERSONERO_MUNICIPAL | 1.0 | Amparo = Tutela |
| **Corrupción grave** | PERSONERO_MUNICIPAL | 0.95 | Alto impacto |
| **Caso ambiguo** | PERSONERO_MUNICIPAL | <0.6 | Requiere experto |
| **Salud sin tutela** | DELEGADA_SALUD | 0.7-0.9 | Competencia clara |
| **Participación** | DELEGADO_PARTICIPACION | 0.7-0.9 | Competencia clara |
| **Servicios públicos** | DELEGADO_VIGILANCIA | 0.7-0.9 | Competencia clara |
| **Medio ambiente** | DELEGADA_DDHH_AMBIENTE | 0.7-0.9 | Competencia clara |

**Regla de Oro: En caso de duda, escalar al Personero Municipal. Es mejor sobrecargarlo que perder una tutela.**

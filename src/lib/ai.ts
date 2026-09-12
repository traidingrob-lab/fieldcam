async function callClaude(messages: Array<{ role: string; content: unknown }>, system?: string) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as { error?: string }))
    throw new Error(err.error || `Claude API error: ${res.status}`)
  }
  const data = await res.json()
  return data.text as string
}

export async function generateProjectReport(projectName: string, photoUrls: string[], checklistSummary: string) {
  const system = `Eres un asistente experto en construcción y remodelación. 
Generas reportes ejecutivos profesionales en español para proyectos de construcción. 
Sé conciso, profesional y útil. Responde SOLO con el reporte, sin preámbulos.`

  const content: unknown[] = [
    {
      type: 'text',
      text: `Genera un reporte ejecutivo del proyecto "${projectName}".
      
Checklist: ${checklistSummary}

El reporte debe incluir:
1. Resumen general (2-3 oraciones)
2. Estado actual del proyecto
3. Puntos críticos o pendientes
4. Próximos pasos recomendados

Formato: usa secciones claras con títulos en negrita.`
    }
  ]

  // Agrega hasta 3 fotos para análisis visual
  if (photoUrls.length > 0) {
    const photosToAnalyze = photoUrls.slice(0, 3)
    content.unshift({
      type: 'text',
      text: 'Analiza estas fotos del proyecto para enriquecer el reporte:'
    })
    for (const url of photosToAnalyze) {
      content.push({ type: 'image', source: { type: 'url', url } })
    }
  }

  return callClaude([{ role: 'user', content }], system)
}

export async function analyzePhoto(imageBase64: string, mimeType = 'image/jpeg') {
  const system = `Eres un inspector experto en construcción. 
Analiza fotos de obras y da descripciones técnicas concisas en español. 
Responde SOLO con JSON válido.`

  const text = await callClaude([{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: imageBase64 }
      },
      {
        type: 'text',
        text: `Analiza esta foto de obra y responde SOLO con este JSON:
{
  "description": "descripción técnica de 1-2 oraciones",
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3"],
  "issues": ["problema1 si existe"],
  "progress_pct": 0-100
}`
      }
    ]
  }], system)

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { description: text, tags: [], issues: [], progress_pct: null }
  }
}

export async function generateChecklist(projectType: string, projectDescription: string) {
  const system = `Eres un experto en gestión de proyectos de construcción en México y Latinoamérica.
Generas checklists profesionales y detalladas. Responde SOLO con JSON válido.`

  const text = await callClaude([{
    role: 'user',
    content: `Genera una checklist profesional para este proyecto de construcción:
Tipo: ${projectType}
Descripción: ${projectDescription}

Responde SOLO con este JSON:
{
  "title": "Nombre de la checklist",
  "items": [
    {"text": "tarea 1", "category": "categoría"},
    {"text": "tarea 2", "category": "categoría"}
  ]
}

Incluye 8-12 ítems relevantes organizados por categorías como: Preparación, Materiales, Ejecución, Revisión, Cierre.`
  }], system)

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { title: 'Checklist generada', items: [] }
  }
}

export async function generateClientDescription(projectName: string, photoCount: number, workType: string) {
  return callClaude([{
    role: 'user',
    content: `Escribe una descripción profesional y atractiva para compartir con el cliente sobre el proyecto "${projectName}".
Tipo de trabajo: ${workType}
Fotos documentadas: ${photoCount}

Máximo 3 oraciones. Tono: profesional pero cercano. En español.`
  }])
}

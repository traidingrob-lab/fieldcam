export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' })
    return
  }

  const { model, max_tokens, system, messages } = req.body || {}
  if (!messages) {
    res.status(400).json({ error: 'messages es requerido' })
    return
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1500,
        system,
        messages
      })
    })

    const data = await anthropicRes.json()
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data?.error?.message || 'Claude API error' })
      return
    }

    res.status(200).json({ text: data.content?.[0]?.text ?? '' })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error desconocido' })
  }
}

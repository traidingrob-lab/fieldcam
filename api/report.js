import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { token } = req.query
  if (!token) {
    res.status(400).json({ error: 'token es requerido' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor' })
    return
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { data, error } = await admin
      .from('reports')
      .select('title, type, content, created_at')
      .eq('share_token', token)
      .single()
    if (error || !data) {
      res.status(404).json({ error: 'Reporte no encontrado' })
      return
    }
    res.status(200).json({ report: data })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Error al buscar el reporte' })
  }
}

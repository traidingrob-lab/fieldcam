import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor' })
    return
  }

  const { email, full_name, role, orgId } = req.body || {}
  if (!email || !full_name || !role || !orgId) {
    res.status(400).json({ error: 'email, full_name, role y orgId son requeridos' })
    return
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name }
    })
    if (inviteError) throw inviteError

    const { data: member, error: memberError } = await admin.from('team_members').insert({
      user_id: invited.user.id,
      org_id: orgId,
      role,
      full_name,
      email,
      status: 'offline'
    }).select().single()
    if (memberError) throw memberError

    res.status(200).json({ member })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Error al invitar miembro' })
  }
}

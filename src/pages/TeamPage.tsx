import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import { useAppStore, useToastStore } from '@/store'
import { UserPlus, Mail, Phone, X, Send, Trash2 } from 'lucide-react'

type Member = {
  id: string; user_id: string; org_id: string; role: string
  full_name: string; email: string | null; status: string; created_at: string
}

const ROLES: Record<string, string> = { admin: 'Admin', supervisor: 'Supervisor', technician: 'Técnico', client: 'Cliente' }
const ROLE_COLORS: Record<string, string> = { admin: 'bg-purple-100 text-purple-800', supervisor: 'bg-blue-100 text-blue-800', technician: 'bg-green-100 text-green-800', client: 'bg-gray-100 text-gray-600' }
const AVATAR_COLORS = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700']
const STATUS_COLORS: Record<string, string> = { active: 'bg-green-400', away: 'bg-amber-400', offline: 'bg-gray-300' }
const STATUS_LABELS: Record<string, string> = { active: 'En campo', away: 'Disponible', offline: 'Pendiente / inactivo' }

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showInvite, setShowInvite] = useState(false)
  const { user } = useAppStore()
  const { addToast } = useToastStore()

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('org_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setMembers(data || [])
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al cargar el equipo', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function changeRole(id: string, role: string) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
    const { error } = await supabase.from('team_members').update({ role }).eq('id', id)
    if (error) {
      addToast('Error al cambiar el rol', 'error')
      loadMembers()
    }
  }

  async function deleteMember(id: string) {
    if (!window.confirm('¿Quitar a este miembro del equipo?')) return
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      if (error) throw error
      setMembers((prev) => prev.filter((m) => m.id !== id))
      addToast('Miembro eliminado', 'info')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al eliminar miembro', 'error')
    }
  }

  const filtered = filter === 'all' ? members : members.filter((m) => m.role === filter || m.status === filter)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Equipo</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} miembros</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Invitar
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {[['all', 'Todos'], ['active', 'En campo'], ['supervisor', 'Supervisores'], ['technician', 'Técnicos']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full border flex-shrink-0 transition-colors ${
              filter === val ? 'bg-brand-400 text-white border-brand-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-40 skeleton rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => {
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base flex-shrink-0 ${avatarColor}`}>
                    {getInitials(m.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[m.status]}`} />
                      <span className="text-xs text-gray-400">{STATUS_LABELS[m.status]}</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">{m.full_name}</p>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className={`badge text-xs mt-1 border-0 cursor-pointer ${ROLE_COLORS[m.role]}`}
                    >
                      {Object.entries(ROLES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  </div>
                  <button onClick={() => deleteMember(m.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-500 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <a href={m.email ? `mailto:${m.email}` : undefined} className={`btn-ghost flex-1 justify-center text-xs py-1.5 ${!m.email ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                  <a href={m.email ? `tel:${m.email}` : undefined} className={`btn-ghost flex-1 justify-center text-xs py-1.5 ${!m.email ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Phone className="w-3.5 h-3.5" /> Llamar
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <UserPlus className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Todavía no hay miembros en tu equipo.</p>
        </div>
      )}

      {showInvite && (
        <InviteModal
          orgId={user!.id}
          onClose={() => setShowInvite(false)}
          onInvited={() => { loadMembers(); setShowInvite(false) }}
        />
      )}
    </div>
  )
}

function InviteModal({ orgId, onClose, onInvited }: { orgId: string; onClose: () => void; onInvited: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'technician' })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToastStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, full_name: form.name, role: form.role, orgId })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(err.error || `Error ${res.status}`)
      }
      addToast(`Invitación enviada a ${form.email}`, 'success')
      onInvited()
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al invitar miembro', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold">Invitar miembro</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="label">Nombre completo</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ana García" required /></div>
          <div><label className="label">Correo electrónico</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@empresa.com" required /></div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="technician">Técnico</option>
              <option value="supervisor">Supervisor</option>
              <option value="client">Cliente (solo lectura)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" />Enviar invitación</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

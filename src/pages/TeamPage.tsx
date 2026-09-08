import { useState } from 'react'
import { getInitials } from '@/lib/utils'
import { useToastStore } from '@/store'
import { UserPlus, Mail, Phone, Image, Folder, X, Send } from 'lucide-react'

type Member = { id: string; full_name: string; role: string; status: string; photo_count: number; project_count: number; email: string }

const ROLES: Record<string, string> = { admin: 'Admin', supervisor: 'Supervisor', technician: 'Técnico', client: 'Cliente' }
const ROLE_COLORS: Record<string, string> = { admin: 'bg-purple-100 text-purple-800', supervisor: 'bg-blue-100 text-blue-800', technician: 'bg-green-100 text-green-800', client: 'bg-gray-100 text-gray-600' }
const AVATAR_COLORS = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700']
const STATUS_COLORS: Record<string, string> = { active: 'bg-green-400', away: 'bg-amber-400', offline: 'bg-gray-300' }
const STATUS_LABELS: Record<string, string> = { active: 'En campo', away: 'Disponible', offline: 'Inactivo' }

const DEMO_MEMBERS: Member[] = [
  { id: '1', full_name: 'Juan Rodríguez', role: 'admin', status: 'active', photo_count: 124, project_count: 8, email: 'juan@empresa.com' },
  { id: '2', full_name: 'María Arteaga', role: 'technician', status: 'active', photo_count: 89, project_count: 5, email: 'maria@empresa.com' },
  { id: '3', full_name: 'Carlos Ríos', role: 'technician', status: 'away', photo_count: 61, project_count: 3, email: 'carlos@empresa.com' },
  { id: '4', full_name: 'Luis Pérez', role: 'supervisor', status: 'offline', photo_count: 210, project_count: 6, email: 'luis@empresa.com' },
  { id: '5', full_name: 'Ana Gutiérrez', role: 'supervisor', status: 'active', photo_count: 98, project_count: 4, email: 'ana@empresa.com' },
]

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS)
  const [filter, setFilter] = useState<string>('all')
  const [showInvite, setShowInvite] = useState(false)
  const { addToast } = useToastStore()

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
                  <span className={`badge text-xs mt-1 ${ROLE_COLORS[m.role]}`}>{ROLES[m.role]}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 py-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{m.project_count}</p>
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><Folder className="w-3 h-3" />proyectos</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{m.photo_count}</p>
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><Image className="w-3 h-3" />fotos</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <a href={`mailto:${m.email}`} className="btn-ghost flex-1 justify-center text-xs py-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </a>
                <a href={`tel:${m.email}`} className="btn-ghost flex-1 justify-center text-xs py-1.5">
                  <Phone className="w-3.5 h-3.5" /> Llamar
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={(name, email, role) => {
        setMembers((prev) => [...prev, { id: Math.random().toString(36).slice(2), full_name: name, role, status: 'offline', photo_count: 0, project_count: 0, email }])
        addToast(`Invitación enviada a ${email}`, 'success')
        setShowInvite(false)
      }} />}
    </div>
  )
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (name: string, email: string, role: string) => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'technician' })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onInvited(form.name, form.email, form.role)
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
            <button type="submit" className="btn-primary flex-1 justify-center"><Send className="w-4 h-4" />Enviar invitación</button>
          </div>
        </form>
      </div>
    </div>
  )
}

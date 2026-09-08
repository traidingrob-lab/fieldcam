import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore, useToastStore } from '@/store'
import { formatRelative, PROJECT_TYPES } from '@/lib/utils'
import {
  Plus, Folder, MapPin, Image, Search, Filter, LayoutGrid, List, X
} from 'lucide-react'

type Project = {
  id: string; name: string; description: string | null; status: string
  address: string | null; city: string | null; cover_photo_url: string | null
  created_at: string; photo_count?: number
}

type Status = 'all' | 'active' | 'complete' | 'pending'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', complete: 'Completo', pending: 'Pendiente', archived: 'Archivado'
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const { user } = useAppStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch {
      // Usar datos demo si Supabase no está configurado
      setProjects(DEMO_PROJECTS)
    } finally {
      setLoading(false)
    }
  }

  const filtered = projects.filter((p) => {
    const matchStatus = filter === 'all' || p.status === filter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} proyectos en total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Buscar proyecto o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(['all', 'active', 'complete', 'pending'] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === s
                ? 'bg-brand-400 text-white border-brand-400'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setView('grid')} className={`p-2 rounded-md ${view === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            <LayoutGrid className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => setView('list')} className={`p-2 rounded-md ${view === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            <List className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : ''}`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-48 skeleton rounded-lg" />
          ))}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} onClick={() => navigate(`/app/projects/${p.id}`)} />)}
          <button
            onClick={() => setShowModal(true)}
            className="card border-dashed border-2 border-gray-300 flex flex-col items-center justify-center gap-2 h-48 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
          >
            <Plus className="w-8 h-8 text-gray-300 group-hover:text-brand-400" />
            <span className="text-sm text-gray-400 group-hover:text-brand-600">Nuevo proyecto</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => <ProjectRow key={p.id} project={p} onClick={() => navigate(`/app/projects/${p.id}`)} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Folder className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No hay proyectos. ¡Crea el primero!</p>
        </div>
      )}

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreated={loadProjects} />}
    </div>
  )
}

function ProjectCard({ project: p, onClick }: { project: Project; onClick: () => void }) {
  const colors = ['bg-brand-50', 'bg-blue-50', 'bg-amber-50', 'bg-purple-50', 'bg-pink-50']
  const color = colors[p.name.charCodeAt(0) % colors.length]
  return (
    <div className="card overflow-hidden cursor-pointer hover:border-gray-300 transition-all group" onClick={onClick}>
      <div className={`h-28 ${color} flex items-center justify-center relative overflow-hidden`}>
        {p.cover_photo_url ? (
          <img src={p.cover_photo_url} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <Folder className="w-10 h-10 text-gray-200" />
        )}
        <span className={`absolute top-2 right-2 badge ${
          p.status === 'active' ? 'badge-active' :
          p.status === 'complete' ? 'badge-complete' : 'badge-pending'
        }`}>
          {STATUS_LABELS[p.status] || p.status}
        </span>
      </div>
      <div className="p-3">
        <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {p.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
          <span className="flex items-center gap-1"><Image className="w-3 h-3" />{p.photo_count || 0} fotos</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{formatRelative(p.created_at)}</p>
      </div>
    </div>
  )
}

function ProjectRow({ project: p, onClick }: { project: Project; onClick: () => void }) {
  return (
    <div className="card p-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition-colors" onClick={onClick}>
      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
        <Folder className="w-5 h-5 text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900">{p.name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
          {p.city && <><MapPin className="w-3 h-3" />{p.city} · </>}
          {formatRelative(p.created_at)}
        </p>
      </div>
      <span className={`badge ${
        p.status === 'active' ? 'badge-active' :
        p.status === 'complete' ? 'badge-complete' : 'badge-pending'
      }`}>
        {STATUS_LABELS[p.status] || p.status}
      </span>
    </div>
  )
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAppStore()
  const { addToast } = useToastStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: '', city: '', address: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('projects').insert({
        name: form.name,
        description: form.description || null,
        city: form.city || null,
        address: form.address || null,
        status: 'active',
        owner_id: user!.id
      })
      if (error) throw error
      addToast('Proyecto creado exitosamente', 'success')
      onCreated()
      onClose()
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al crear proyecto', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Nuevo proyecto</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="label">Nombre del proyecto *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Remodelación casa López" required />
          </div>
          <div>
            <label className="label">Tipo de trabajo</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">Selecciona un tipo...</option>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ciudad</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="CDMX" />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle 123" />
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalla el trabajo a realizar..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DEMO_PROJECTS: Project[] = [
  { id: '1', name: 'Remodelación López', description: null, status: 'active', address: 'Av. Insurgentes 456', city: 'Guadalajara', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), photo_count: 47 },
  { id: '2', name: 'Techo Martínez', description: null, status: 'complete', address: null, city: 'CDMX', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), photo_count: 83 },
  { id: '3', name: 'Plomería Sánchez', description: null, status: 'pending', address: null, city: 'Monterrey', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 1).toISOString(), photo_count: 12 },
  { id: '4', name: 'Eléctrico García', description: null, status: 'active', address: null, city: 'Puebla', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), photo_count: 29 },
  { id: '5', name: 'Pintura Oficina Flores', description: null, status: 'active', address: null, city: 'CDMX', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), photo_count: 55 },
]

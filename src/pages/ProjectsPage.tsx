import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store'
import { formatRelative } from '@/lib/utils'
import ProjectFormModal from '@/components/ProjectFormModal'
import {
  Plus, Folder, MapPin, Image, Search, LayoutGrid, List, Pencil, Trash2
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
  const [editingProject, setEditingProject] = useState<Project | null>(null)
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

  async function handleStatusChange(id: string, status: string) {
    const prev = projects
    setProjects((cur) => cur.map((p) => (p.id === id ? { ...p, status } : p)))
    const { error } = await supabase.from('projects').update({ status }).eq('id', id)
    if (error) {
      setProjects(prev)
      addToast('Error al cambiar estado', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este proyecto? También se borrarán sus fotos y checklists.')) return
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      setProjects((cur) => cur.filter((p) => p.id !== id))
      addToast('Proyecto eliminado', 'info')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al eliminar proyecto', 'error')
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
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p}
              onClick={() => navigate(`/app/projects/${p.id}`)}
              onEdit={() => setEditingProject(p)}
              onDelete={() => handleDelete(p.id)}
              onStatusChange={(status) => handleStatusChange(p.id, status)}
            />
          ))}
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
          {filtered.map((p) => (
            <ProjectRow key={p.id} project={p}
              onClick={() => navigate(`/app/projects/${p.id}`)}
              onEdit={() => setEditingProject(p)}
              onDelete={() => handleDelete(p.id)}
              onStatusChange={(status) => handleStatusChange(p.id, status)}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Folder className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No hay proyectos. ¡Crea el primero!</p>
        </div>
      )}

      {showModal && <ProjectFormModal onClose={() => setShowModal(false)} onSaved={loadProjects} />}
      {editingProject && <ProjectFormModal project={editingProject} onClose={() => setEditingProject(null)} onSaved={loadProjects} />}
    </div>
  )
}

function ProjectCard({ project: p, onClick, onEdit, onDelete, onStatusChange }: {
  project: Project; onClick: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (status: string) => void
}) {
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
        <select
          value={p.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`absolute top-2 right-2 badge border-0 cursor-pointer ${
            p.status === 'active' ? 'badge-active' :
            p.status === 'complete' ? 'badge-complete' : 'badge-pending'
          }`}
        >
          {(['active', 'complete', 'pending'] as const).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
          <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {p.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
          <span className="flex items-center gap-1"><Image className="w-3 h-3" />{p.photo_count || 0} fotos</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{formatRelative(p.created_at)}</p>
      </div>
    </div>
  )
}

function ProjectRow({ project: p, onClick, onEdit, onDelete, onStatusChange }: {
  project: Project; onClick: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (status: string) => void
}) {
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
      <select
        value={p.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(e.target.value)}
        className={`badge border-0 cursor-pointer flex-shrink-0 ${
          p.status === 'active' ? 'badge-active' :
          p.status === 'complete' ? 'badge-complete' : 'badge-pending'
        }`}
      >
        {(['active', 'complete', 'pending'] as const).map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
      <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 flex-shrink-0">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
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

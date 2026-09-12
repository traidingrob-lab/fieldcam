import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store'
import { formatDate } from '@/lib/utils'
import ProjectFormModal from '@/components/ProjectFormModal'
import { ArrowLeft, MapPin, Image, CheckSquare, Calendar, Folder, Pencil, Trash2 } from 'lucide-react'

type Project = {
  id: string; name: string; description: string | null; status: string
  address: string | null; city: string | null; cover_photo_url: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', complete: 'Completo', pending: 'Pendiente', archived: 'Archivado'
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const [checklistCount, setChecklistCount] = useState(0)
  const [editing, setEditing] = useState(false)

  useEffect(() => { loadProject() }, [id])

  async function loadProject() {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    try {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
      if (error) throw error
      setProject(data)

      const [{ count: photos }, { count: checklists }] = await Promise.all([
        supabase.from('photos').select('id', { count: 'exact', head: true }).eq('project_id', id),
        supabase.from('checklists').select('id', { count: 'exact', head: true }).eq('project_id', id)
      ])
      setPhotoCount(photos || 0)
      setChecklistCount(checklists || 0)
    } catch {
      const demo = DEMO_PROJECTS.find((p) => p.id === id)
      if (demo) {
        setProject(demo)
        setPhotoCount(demo.photo_count || 0)
        setChecklistCount(0)
      } else {
        setNotFound(true)
        addToast('No se pudo cargar el proyecto', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(status: string) {
    if (!project) return
    const prev = project
    setProject({ ...project, status })
    const { error } = await supabase.from('projects').update({ status }).eq('id', project.id)
    if (error) {
      setProject(prev)
      addToast('Error al cambiar estado', 'error')
    }
  }

  async function handleDelete() {
    if (!project) return
    if (!window.confirm('¿Eliminar este proyecto? También se borrarán sus fotos y checklists.')) return
    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id)
      if (error) throw error
      addToast('Proyecto eliminado', 'info')
      navigate('/app/projects')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al eliminar proyecto', 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="h-6 w-32 skeleton rounded mb-6" />
        <div className="card h-56 skeleton rounded-lg" />
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto text-center py-16">
        <Folder className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 mb-4">No se encontró el proyecto.</p>
        <Link to="/app/projects" className="btn-ghost inline-flex">
          <ArrowLeft className="w-4 h-4" /> Volver a proyectos
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/app/projects')} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Proyectos
        </button>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="btn-ghost">
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="h-40 bg-brand-50 flex items-center justify-center relative">
          {project.cover_photo_url ? (
            <img src={project.cover_photo_url} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <Folder className="w-12 h-12 text-gray-200" />
          )}
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`absolute top-3 right-3 badge border-0 cursor-pointer ${
              project.status === 'active' ? 'badge-active' :
              project.status === 'complete' ? 'badge-complete' : 'badge-pending'
            }`}
          >
            {(['active', 'complete', 'pending'] as const).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="p-5">
          <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-600 mt-2">{project.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
            {(project.address || project.city) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {[project.address, project.city].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Creado el {formatDate(project.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/app/photos" className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Image className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{photoCount}</p>
            <p className="text-xs text-gray-500">Fotos</p>
          </div>
        </Link>
        <Link to="/app/checklists" className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{checklistCount}</p>
            <p className="text-xs text-gray-500">Checklists</p>
          </div>
        </Link>
      </div>

      {editing && (
        <ProjectFormModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={loadProject}
        />
      )}
    </div>
  )
}

const DEMO_PROJECTS: (Project & { photo_count?: number })[] = [
  { id: '1', name: 'Remodelación López', description: null, status: 'active', address: 'Av. Insurgentes 456', city: 'Guadalajara', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), photo_count: 47 },
  { id: '2', name: 'Techo Martínez', description: null, status: 'complete', address: null, city: 'CDMX', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), photo_count: 83 },
  { id: '3', name: 'Plomería Sánchez', description: null, status: 'pending', address: null, city: 'Monterrey', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 1).toISOString(), photo_count: 12 },
  { id: '4', name: 'Eléctrico García', description: null, status: 'active', address: null, city: 'Puebla', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), photo_count: 29 },
  { id: '5', name: 'Pintura Oficina Flores', description: null, status: 'active', address: null, city: 'CDMX', cover_photo_url: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), photo_count: 55 },
]

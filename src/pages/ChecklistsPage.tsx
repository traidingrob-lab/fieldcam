import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore, useToastStore } from '@/store'
import { generateChecklist } from '@/lib/ai'
import { PROJECT_TYPES } from '@/lib/utils'
import { CheckSquare, Plus, Sparkles, Trash2, X, Check, Pencil } from 'lucide-react'

type ChecklistItem = {
  id: string; text: string; completed: boolean; assigned_to: string | null
  order_index: number; completed_at: string | null
}
type Checklist = { id: string; title: string; project_id: string; items: ChecklistItem[] }
type ProjectOption = { id: string; name: string }

const DEMO_PROJECT_OPTIONS: ProjectOption[] = [
  { id: '1', name: 'Remodelación López' },
  { id: '2', name: 'Techo Martínez' },
  { id: '3', name: 'Plomería Sánchez' },
  { id: '4', name: 'Eléctrico García' },
  { id: '5', name: 'Pintura Oficina Flores' }
]

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const { user } = useAppStore()
  const { addToast } = useToastStore()

  useEffect(() => { loadProjects() }, [])

  useEffect(() => {
    if (selectedProjectId) loadChecklists()
    else setChecklists([])
  }, [selectedProjectId])

  async function loadProjects() {
    try {
      const { data, error } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
      if (data && data.length > 0) setSelectedProjectId(data[0].id)
    } catch {
      setProjects(DEMO_PROJECT_OPTIONS)
      setSelectedProjectId(DEMO_PROJECT_OPTIONS[0].id)
    }
  }

  async function loadChecklists() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*, checklist_items(*)')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .order('order_index', { foreignTable: 'checklist_items', ascending: true })
      if (error) throw error
      setChecklists((data || []).map((cl) => ({
        id: cl.id, title: cl.title, project_id: cl.project_id,
        items: cl.checklist_items || []
      })))
    } catch (err: unknown) {
      setChecklists([])
      addToast((err as Error).message || 'Error al cargar checklists', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleItem(clId: string, itemId: string) {
    const cl = checklists.find((c) => c.id === clId)
    const item = cl?.items.find((i) => i.id === itemId)
    if (!item) return
    const completed = !item.completed
    setChecklists((prev) => prev.map((c) =>
      c.id === clId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, completed } : i)) } : c
    ))
    const { error } = await supabase.from('checklist_items')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', itemId)
    if (error) {
      addToast('Error al actualizar tarea', 'error')
      loadChecklists()
    }
  }

  async function addItem(clId: string, text: string) {
    const cl = checklists.find((c) => c.id === clId)
    const order_index = cl ? cl.items.length : 0
    try {
      const { data, error } = await supabase.from('checklist_items')
        .insert({ checklist_id: clId, text, completed: false, assigned_to: null, order_index })
        .select().single()
      if (error) throw error
      setChecklists((prev) => prev.map((c) =>
        c.id === clId ? { ...c, items: [...c.items, data as ChecklistItem] } : c
      ))
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al agregar tarea', 'error')
    }
  }

  async function editItem(clId: string, itemId: string, text: string) {
    setChecklists((prev) => prev.map((c) =>
      c.id === clId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, text } : i)) } : c
    ))
    const { error } = await supabase.from('checklist_items').update({ text }).eq('id', itemId)
    if (error) {
      addToast('Error al editar tarea', 'error')
      loadChecklists()
    }
  }

  async function deleteItem(clId: string, itemId: string) {
    try {
      const { error } = await supabase.from('checklist_items').delete().eq('id', itemId)
      if (error) throw error
      setChecklists((prev) => prev.map((c) =>
        c.id === clId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      ))
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al eliminar tarea', 'error')
    }
  }

  async function deleteChecklist(clId: string) {
    if (!window.confirm('¿Eliminar esta checklist completa?')) return
    try {
      const { error } = await supabase.from('checklists').delete().eq('id', clId)
      if (error) throw error
      setChecklists((prev) => prev.filter((c) => c.id !== clId))
      addToast('Checklist eliminada', 'info')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al eliminar checklist', 'error')
    }
  }

  async function createChecklist(title: string) {
    try {
      const { data, error } = await supabase.from('checklists')
        .insert({ title, project_id: selectedProjectId, created_by: user!.id })
        .select().single()
      if (error) throw error
      setChecklists((prev) => [{ id: data.id, title: data.title, project_id: data.project_id, items: [] }, ...prev])
      addToast('Checklist creada', 'success')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al crear checklist', 'error')
      throw err
    }
  }

  async function createChecklistFromAI(title: string, items: { text: string }[]) {
    try {
      const { data: cl, error: clErr } = await supabase.from('checklists')
        .insert({ title, project_id: selectedProjectId, created_by: user!.id })
        .select().single()
      if (clErr) throw clErr

      let newItems: ChecklistItem[] = []
      if (items.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase.from('checklist_items')
          .insert(items.map((it, i) => ({
            checklist_id: cl.id, text: it.text, completed: false, assigned_to: null, order_index: i
          })))
          .select()
        if (itemErr) throw itemErr
        newItems = itemRows || []
      }
      setChecklists((prev) => [{ id: cl.id, title: cl.title, project_id: cl.project_id, items: newItems }, ...prev])
      addToast('Checklist generada con IA', 'success')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al crear checklist', 'error')
      throw err
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">{checklists.length} listas activas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input w-auto min-w-40"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={projects.length === 0}
          >
            {projects.length === 0
              ? <option value="">Sin proyectos</option>
              : projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
          <button onClick={() => setShowAIModal(true)} className="btn-ghost" disabled={!selectedProjectId}>
            <Sparkles className="w-4 h-4 text-purple-500" /> Generar con IA
          </button>
          <button onClick={() => setShowNewModal(true)} className="btn-primary" disabled={!selectedProjectId}>
            <Plus className="w-4 h-4" /> Nueva lista
          </button>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Necesitas crear un proyecto antes de crear checklists. <Link to="/app/projects" className="underline font-medium">Crear proyecto</Link>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-48 skeleton rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checklists.map((cl) => (
            <ChecklistCard key={cl.id} checklist={cl}
              onToggle={(itemId) => toggleItem(cl.id, itemId)}
              onAddItem={(text) => addItem(cl.id, text)}
              onEditItem={(itemId, text) => editItem(cl.id, itemId, text)}
              onDeleteItem={(itemId) => deleteItem(cl.id, itemId)}
              onDelete={() => deleteChecklist(cl.id)}
            />
          ))}
          {selectedProjectId && (
            <button
              onClick={() => setShowNewModal(true)}
              className="card border-dashed border-2 border-gray-300 flex flex-col items-center justify-center gap-2 h-48 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
            >
              <Plus className="w-8 h-8 text-gray-300 group-hover:text-brand-400" />
              <span className="text-sm text-gray-400 group-hover:text-brand-600">Nueva checklist</span>
            </button>
          )}
        </div>
      )}

      {!loading && selectedProjectId && checklists.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No hay checklists para este proyecto todavía.</p>
        </div>
      )}

      {showNewModal && <NewChecklistModal onClose={() => setShowNewModal(false)} onCreate={createChecklist} />}
      {showAIModal && <AIChecklistModal onClose={() => setShowAIModal(false)} onCreate={createChecklistFromAI} />}
    </div>
  )
}

function ChecklistCard({ checklist: cl, onToggle, onAddItem, onEditItem, onDeleteItem, onDelete }: {
  checklist: Checklist
  onToggle: (itemId: string) => void
  onAddItem: (text: string) => void
  onEditItem: (itemId: string, text: string) => void
  onDeleteItem: (itemId: string) => void
  onDelete: () => void
}) {
  const [newItemText, setNewItemText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const done = cl.items.filter((i) => i.completed).length
  const pct = cl.items.length > 0 ? Math.round((done / cl.items.length) * 100) : 0

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim()) return
    onAddItem(newItemText.trim())
    setNewItemText('')
  }

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id)
    setEditText(item.text)
  }

  const commitEdit = () => {
    if (editingId && editText.trim()) onEditItem(editingId, editText.trim())
    setEditingId(null)
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-brand-400" />
          <h3 className="font-medium text-sm text-gray-900">{cl.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{done}/{cl.items.length}</span>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-brand-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-1 mb-3 max-h-56 overflow-y-auto">
        {cl.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 py-2 px-1 rounded-lg hover:bg-gray-50 group transition-colors">
            <div
              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                item.completed ? 'bg-brand-400 border-brand-400' : 'border-gray-300 group-hover:border-brand-300'
              }`}
              onClick={() => onToggle(item.id)}
            >
              {item.completed && <Check className="w-3 h-3 text-white" />}
            </div>
            {editingId === item.id ? (
              <input
                className="input text-sm flex-1 py-1"
                value={editText}
                autoFocus
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit()
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
            ) : (
              <span
                className={`flex-1 text-sm cursor-pointer ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                onClick={() => onToggle(item.id)}
              >
                {item.text}
              </span>
            )}
            {item.assigned_to && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                {item.assigned_to}
              </span>
            )}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => startEdit(item)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => onDeleteItem(item.id)} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          className="input text-sm flex-1"
          placeholder="Agregar ítem..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
        />
        <button type="submit" className="btn-primary px-3">
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

function NewChecklistModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await onCreate(title.trim())
      onClose()
    } catch {
      // el toast de error ya lo muestra el padre
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold">Nueva checklist</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="label">Título</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Inspección final" required autoFocus />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AIChecklistModal({ onClose, onCreate }: {
  onClose: () => void; onCreate: (title: string, items: { text: string }[]) => Promise<void>
}) {
  const [type, setType] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToastStore()

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await generateChecklist(type, desc)
      await onCreate(result.title, result.items || [])
      onClose()
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error generando checklist', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold">Generar checklist con IA</h2>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleGenerate} className="p-4 space-y-3">
          <div>
            <label className="label">Tipo de proyecto</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">Selecciona...</option>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea className="input resize-none h-20" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Remodelación de cocina con cambio de muebles y azulejos..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center" style={{ background: loading ? '#9ca3af' : '#7C3AED' }}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Sparkles className="w-4 h-4" />Generar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

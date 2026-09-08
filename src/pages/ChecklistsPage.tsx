import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore, useToastStore } from '@/store'
import { generateChecklist } from '@/lib/ai'
import { PROJECT_TYPES } from '@/lib/utils'
import { CheckSquare, Plus, Sparkles, Trash2, X, Check, User } from 'lucide-react'

type ChecklistItem = { id: string; text: string; completed: boolean; assigned_to: string | null; order_index: number }
type Checklist = { id: string; title: string; items: ChecklistItem[]; project_id: string }

const DEMO_CHECKLISTS: Checklist[] = [
  { id: 'cl1', title: 'Inspección inicial', project_id: 'demo', items: [
    { id: 'i1', text: 'Revisar estructura exterior', completed: true, assigned_to: 'JR', order_index: 0 },
    { id: 'i2', text: 'Fotografiar fachada', completed: true, assigned_to: 'MA', order_index: 1 },
    { id: 'i3', text: 'Medir áreas principales', completed: true, assigned_to: 'JR', order_index: 2 },
    { id: 'i4', text: 'Documentar daños existentes', completed: false, assigned_to: 'MA', order_index: 3 },
    { id: 'i5', text: 'Informe al cliente', completed: false, assigned_to: 'JR', order_index: 4 },
  ]},
  { id: 'cl2', title: 'Control de calidad', project_id: 'demo', items: [
    { id: 'i6', text: 'Verificar materiales recibidos', completed: true, assigned_to: 'CR', order_index: 0 },
    { id: 'i7', text: 'Prueba de impermeabilización', completed: false, assigned_to: 'CR', order_index: 1 },
    { id: 'i8', text: 'Revisión eléctrica final', completed: false, assigned_to: 'JR', order_index: 2 },
    { id: 'i9', text: 'Firma de conformidad del cliente', completed: false, assigned_to: 'MA', order_index: 3 },
  ]},
]

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(DEMO_CHECKLISTS)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const { addToast } = useToastStore()

  function toggleItem(clId: string, itemId: string) {
    setChecklists((prev) => prev.map((cl) =>
      cl.id === clId ? {
        ...cl,
        items: cl.items.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )
      } : cl
    ))
  }

  function addItem(clId: string, text: string) {
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).slice(2),
      text, completed: false, assigned_to: null, order_index: 999
    }
    setChecklists((prev) => prev.map((cl) =>
      cl.id === clId ? { ...cl, items: [...cl.items, newItem] } : cl
    ))
  }

  function deleteChecklist(clId: string) {
    setChecklists((prev) => prev.filter((cl) => cl.id !== clId))
    addToast('Checklist eliminada', 'info')
  }

  function addChecklist(cl: Checklist) {
    setChecklists((prev) => [...prev, cl])
    addToast('Checklist creada', 'success')
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">{checklists.length} listas activas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAIModal(true)} className="btn-ghost">
            <Sparkles className="w-4 h-4 text-purple-500" /> Generar con IA
          </button>
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva lista
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checklists.map((cl) => (
          <ChecklistCard key={cl.id} checklist={cl}
            onToggle={(itemId) => toggleItem(cl.id, itemId)}
            onAddItem={(text) => addItem(cl.id, text)}
            onDelete={() => deleteChecklist(cl.id)}
          />
        ))}
        <button
          onClick={() => setShowNewModal(true)}
          className="card border-dashed border-2 border-gray-300 flex flex-col items-center justify-center gap-2 h-48 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
        >
          <Plus className="w-8 h-8 text-gray-300 group-hover:text-brand-400" />
          <span className="text-sm text-gray-400 group-hover:text-brand-600">Nueva checklist</span>
        </button>
      </div>

      {showNewModal && <NewChecklistModal onClose={() => setShowNewModal(false)} onCreated={addChecklist} />}
      {showAIModal && <AIChecklistModal onClose={() => setShowAIModal(false)} onCreated={addChecklist} />}
    </div>
  )
}

function ChecklistCard({ checklist: cl, onToggle, onAddItem, onDelete }: {
  checklist: Checklist; onToggle: (id: string) => void; onAddItem: (text: string) => void; onDelete: () => void
}) {
  const [newItemText, setNewItemText] = useState('')
  const done = cl.items.filter((i) => i.completed).length
  const pct = cl.items.length > 0 ? Math.round((done / cl.items.length) * 100) : 0

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim()) return
    onAddItem(newItemText.trim())
    setNewItemText('')
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
          <div
            key={item.id}
            className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
            onClick={() => onToggle(item.id)}
          >
            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              item.completed ? 'bg-brand-400 border-brand-400' : 'border-gray-300 group-hover:border-brand-300'
            }`}>
              {item.completed && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item.text}
            </span>
            {item.assigned_to && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                {item.assigned_to}
              </span>
            )}
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

function NewChecklistModal({ onClose, onCreated }: { onClose: () => void; onCreated: (cl: Checklist) => void }) {
  const [title, setTitle] = useState('')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onCreated({
      id: Math.random().toString(36).slice(2),
      title, project_id: 'demo', items: []
    })
    onClose()
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
            <button type="submit" className="btn-primary flex-1 justify-center">Crear</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AIChecklistModal({ onClose, onCreated }: { onClose: () => void; onCreated: (cl: Checklist) => void }) {
  const [type, setType] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToastStore()

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await generateChecklist(type, desc)
      onCreated({
        id: Math.random().toString(36).slice(2),
        title: result.title,
        project_id: 'demo',
        items: (result.items || []).map((item: { text: string }, i: number) => ({
          id: Math.random().toString(36).slice(2),
          text: item.text,
          completed: false,
          assigned_to: null,
          order_index: i
        }))
      })
      addToast('Checklist generada con IA', 'success')
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

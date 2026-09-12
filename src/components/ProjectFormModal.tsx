import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore, useToastStore } from '@/store'
import { PROJECT_TYPES } from '@/lib/utils'
import { X } from 'lucide-react'

type ProjectLike = {
  id: string
  name: string
  description: string | null
  city: string | null
  address: string | null
}

export default function ProjectFormModal({ project, onClose, onSaved }: {
  project?: ProjectLike; onClose: () => void; onSaved: () => void
}) {
  const { user } = useAppStore()
  const { addToast } = useToastStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    type: '',
    city: project?.city || '',
    address: project?.address || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (project) {
        const { error } = await supabase.from('projects').update({
          name: form.name,
          description: form.description || null,
          city: form.city || null,
          address: form.address || null
        }).eq('id', project.id)
        if (error) throw error
        addToast('Proyecto actualizado', 'success')
      } else {
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
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al guardar proyecto', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{project ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
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
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : (project ? 'Guardar cambios' : 'Crear proyecto')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

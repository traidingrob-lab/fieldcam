import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabase'
import { generateProjectReport } from '@/lib/ai'
import { useAppStore, useToastStore } from '@/store'
import { formatDate } from '@/lib/utils'
import { FileText, Sparkles, Image, Eye, Download, Share2, X, Copy, Check } from 'lucide-react'

type Report = {
  id: string; title: string; type: string; created_at: string
  pdf_url: string | null; content: string | null; project_id: string; share_token: string | null
}

type ProjectOption = { id: string; name: string }

const DEMO_PROJECT_OPTIONS: ProjectOption[] = [
  { id: '1', name: 'Remodelación López' },
  { id: '2', name: 'Techo Martínez' },
  { id: '3', name: 'Plomería Sánchez' },
  { id: '4', name: 'Eléctrico García' },
  { id: '5', name: 'Pintura Oficina Flores' }
]

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  photo: { label: 'Fotográfico', icon: Image, color: 'text-brand-600', bg: 'bg-brand-50' },
  ai_summary: { label: 'Resumen IA', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  client_gallery: { label: 'Galería cliente', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  inspection: { label: 'Inspección', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
}

function shareUrl(token: string) {
  return `${import.meta.env.VITE_APP_URL || window.location.origin}/share/report/${token}`
}

function downloadPdf(r: Report) {
  const doc = new jsPDF()
  const marginX = 15
  let y = 20
  doc.setFontSize(16)
  doc.text(r.title, marginX, y)
  y += 8
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(formatDate(r.created_at), marginX, y)
  y += 10
  doc.setTextColor(30)
  doc.setFontSize(11)
  const lines = doc.splitTextToSize(r.content || 'Sin contenido disponible.', 180)
  doc.text(lines, marginX, y)
  doc.save(`${r.title.replace(/[^\w-]+/g, '_')}.pdf`)
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Report | null>(null)
  const [generating, setGenerating] = useState(false)
  const { user } = useAppStore()
  const { addToast } = useToastStore()

  useEffect(() => { loadProjects(); loadReports() }, [])

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

  async function loadReports() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setReports(data || [])
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al cargar reportes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.type === filter)

  const generateReport = async () => {
    if (!selectedProjectId) return
    setGenerating(true)
    try {
      const project = projects.find((p) => p.id === selectedProjectId)

      const [{ data: photoRows }, { data: checklistRows }] = await Promise.all([
        supabase.from('photos').select('url').eq('project_id', selectedProjectId).order('taken_at', { ascending: false }).limit(3),
        supabase.from('checklists').select('id, checklist_items(completed)').eq('project_id', selectedProjectId)
      ])

      const photoUrls = (photoRows || []).map((p) => p.url)
      let total = 0, done = 0
      for (const cl of (checklistRows || []) as { checklist_items: { completed: boolean }[] }[]) {
        const items = cl.checklist_items || []
        total += items.length
        done += items.filter((i) => i.completed).length
      }
      const checklistSummary = total > 0
        ? `${done}/${total} ítems completados en las checklists del proyecto.`
        : 'Sin checklists registradas todavía.'

      const content = await generateProjectReport(project?.name || 'Proyecto', photoUrls, checklistSummary)

      const { data: saved, error } = await supabase.from('reports').insert({
        project_id: selectedProjectId,
        title: `Resumen IA — ${project?.name || 'Proyecto'} — ${new Date().toLocaleDateString('es-MX')}`,
        type: 'ai_summary',
        content,
        created_by: user!.id
      }).select().single()
      if (error) throw error

      setReports((prev) => [saved, ...prev])
      setSelected(saved)
      addToast('Reporte generado con IA', 'success')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error generando reporte', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleShare = (r: Report) => {
    if (!r.share_token) {
      addToast('Este reporte no tiene link para compartir', 'error')
      return
    }
    navigator.clipboard.writeText(shareUrl(r.share_token))
    addToast('Link copiado al portapapeles', 'success')
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reports.length} reportes generados</p>
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
          <button onClick={generateReport} disabled={generating || !selectedProjectId} className="btn-primary" style={{ background: '#7C3AED' }}>
            {generating
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Sparkles className="w-4 h-4" />Generar con IA</>
            }
          </button>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Necesitas crear un proyecto antes de generar reportes. <Link to="/app/projects" className="underline font-medium">Crear proyecto</Link>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[['all', 'Todos'], ['photo', 'Fotográficos'], ['ai_summary', 'IA'], ['client_gallery', 'Cliente'], ['inspection', 'Inspección']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full border flex-shrink-0 transition-colors ${
              filter === val ? 'bg-brand-400 text-white border-brand-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-16 skeleton rounded-lg" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => {
            const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.photo
            const Icon = cfg.icon
            return (
              <div key={r.id} className="card p-4 flex items-center gap-4 hover:border-gray-300 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cfg.label} · {formatDate(r.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); setSelected(r) }}><Eye className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); handleShare(r) }}><Share2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No hay reportes todavía. ¡Genera el primero!</p>
        </div>
      )}

      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} onShare={() => handleShare(selected)} />}
    </div>
  )
}

function ReportModal({ report: r, onClose, onShare }: { report: Report; onClose: () => void; onShare: () => void }) {
  const [copied, setCopied] = useState(false)
  const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.photo
  const Icon = cfg.icon

  const copy = () => {
    navigator.clipboard.writeText(r.content || r.title)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900 truncate max-w-72">{r.title}</p>
              <p className="text-xs text-gray-400">{cfg.label} · {formatDate(r.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {r.content ? (
            <div className="prose prose-sm text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Vista previa no disponible</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={copy} className="btn-ghost flex-1 justify-center">
            {copied ? <><Check className="w-4 h-4 text-green-500" />Copiado</> : <><Copy className="w-4 h-4" />Copiar</>}
          </button>
          <button onClick={onShare} className="btn-ghost flex-1 justify-center">
            <Share2 className="w-4 h-4" />Compartir
          </button>
          <button onClick={() => downloadPdf(r)} className="btn-primary flex-1 justify-center">
            <Download className="w-4 h-4" />Descargar PDF
          </button>
        </div>
      </div>
    </div>
  )
}

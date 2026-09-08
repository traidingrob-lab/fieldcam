import { useState } from 'react'
import { generateProjectReport, generateClientDescription } from '@/lib/ai'
import { useToastStore } from '@/store'
import { formatDate } from '@/lib/utils'
import { FileText, Sparkles, Image, Eye, Download, Share2, X, Copy, Check } from 'lucide-react'

type Report = {
  id: string; title: string; type: string; created_at: string
  pdf_url: string | null; content: string | null; photos: number
}

const DEMO_REPORTS: Report[] = [
  { id: '1', title: 'Reporte fotográfico — Remodelación López', type: 'photo', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), pdf_url: null, content: null, photos: 47 },
  { id: '2', title: 'Resumen IA — Avance semanal', type: 'ai_summary', created_at: new Date(Date.now() - 86400000).toISOString(), pdf_url: null, content: '**Estado del proyecto**\n\nEl proyecto avanza según lo planificado con un 65% de completitud. Se han documentado 47 fotos de progreso.\n\n**Puntos críticos**\n\n- Pendiente revisión eléctrica\n- Material de techo en espera\n\n**Próximos pasos**\n\n1. Programar inspección eléctrica\n2. Confirmar llegada de materiales\n3. Actualizar cliente sobre progreso', photos: 47 },
  { id: '3', title: 'Galería cliente — Techo Martínez', type: 'client_gallery', created_at: new Date(Date.now() - 86400000 * 5).toISOString(), pdf_url: null, content: null, photos: 83 },
  { id: '4', title: 'Inspección final — Eléctrico García', type: 'inspection', created_at: new Date(Date.now() - 86400000 * 3).toISOString(), pdf_url: null, content: null, photos: 29 },
]

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  photo: { label: 'Fotográfico', icon: Image, color: 'text-brand-600', bg: 'bg-brand-50' },
  ai_summary: { label: 'Resumen IA', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  client_gallery: { label: 'Galería cliente', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  inspection: { label: 'Inspección', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(DEMO_REPORTS)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Report | null>(null)
  const [generating, setGenerating] = useState(false)
  const { addToast } = useToastStore()

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.type === filter)

  const generateReport = async () => {
    setGenerating(true)
    try {
      const content = await generateProjectReport(
        'Remodelación López',
        [`https://picsum.photos/seed/1/400/300`, `https://picsum.photos/seed/2/400/300`],
        '3/5 ítems completados: estructura revisada, fotos tomadas, medidas realizadas.'
      )
      const newReport: Report = {
        id: Math.random().toString(36).slice(2),
        title: `Resumen IA — ${new Date().toLocaleDateString('es-MX')}`,
        type: 'ai_summary',
        created_at: new Date().toISOString(),
        pdf_url: null, content, photos: 47
      }
      setReports((prev) => [newReport, ...prev])
      setSelected(newReport)
      addToast('Reporte generado con IA', 'success')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error generando reporte', 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reports.length} reportes generados</p>
        </div>
        <button onClick={generateReport} disabled={generating} className="btn-primary" style={{ background: '#7C3AED' }}>
          {generating
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Sparkles className="w-4 h-4" />Generar con IA</>
          }
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[['all', 'Todos'], ['photo', 'Fotográficos'], ['ai_summary', 'IA'], ['client_gallery', 'Cliente'], ['inspection', 'Inspección']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full border flex-shrink-0 transition-colors ${
              filter === val ? 'bg-brand-400 text-white border-brand-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >{label}</button>
        ))}
      </div>

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
                <p className="text-xs text-gray-400 mt-0.5">{cfg.label} · {r.photos} fotos · {formatDate(r.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); setSelected(r) }}><Eye className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}><Share2 className="w-4 h-4" /></button>
              </div>
            </div>
          )
        })}
      </div>

      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function ReportModal({ report: r, onClose }: { report: Report; onClose: () => void }) {
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
          <button className="btn-primary flex-1 justify-center"><Download className="w-4 h-4" />Descargar PDF</button>
        </div>
      </div>
    </div>
  )
}

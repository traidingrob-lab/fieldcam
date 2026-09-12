import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDate } from '@/lib/utils'
import { Camera, FileText } from 'lucide-react'

type SharedReport = { title: string; type: string; content: string | null; created_at: string }

export default function ShareReportPage() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<SharedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/report?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Reporte no encontrado')
        setReport(data.report)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">FieldCam</span>
        </div>

        <div className="card p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-2/3 skeleton rounded" />
              <div className="h-4 w-1/3 skeleton rounded" />
              <div className="h-32 skeleton rounded mt-4" />
            </div>
          ) : error || !report ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">{error || 'Reporte no encontrado.'}</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900">{report.title}</h1>
              <p className="text-xs text-gray-400 mt-1 mb-4">{formatDate(report.created_at)}</p>
              <div className="prose prose-sm text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                {report.content || 'Sin contenido disponible.'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

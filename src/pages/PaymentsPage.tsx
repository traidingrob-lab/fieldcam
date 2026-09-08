import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToastStore } from '@/store'
import { CreditCard, Plus, TrendingUp, Clock, AlertCircle, X, Send } from 'lucide-react'

type Invoice = {
  id: string; invoice_num: string; client_name: string; project: string
  amount: number; status: 'paid' | 'pending' | 'overdue'; due_date: string; created_at: string
}

const DEMO_INVOICES: Invoice[] = [
  { id: '1', invoice_num: 'INV-041', client_name: 'Roberto López', project: 'Remodelación López', amount: 28000, status: 'paid', due_date: '2025-05-15', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '2', invoice_num: 'INV-042', client_name: 'Ana Sánchez', project: 'Plomería Sánchez', amount: 8500, status: 'pending', due_date: '2025-06-20', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '3', invoice_num: 'INV-039', client_name: 'Pedro Martínez', project: 'Techo Martínez', amount: 12000, status: 'overdue', due_date: '2025-05-01', created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: '4', invoice_num: 'INV-043', client_name: 'Luis García', project: 'Eléctrico García', amount: 15700, status: 'pending', due_date: '2025-06-25', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', invoice_num: 'INV-040', client_name: 'Carmen Flores', project: 'Pintura Flores', amount: 56500, status: 'paid', due_date: '2025-05-30', created_at: new Date(Date.now() - 86400000 * 8).toISOString() },
]

const STATUS_CONFIG = {
  paid: { label: 'Pagado', class: 'badge-active' },
  pending: { label: 'Pendiente', class: 'badge-pending' },
  overdue: { label: 'Vencido', class: 'bg-red-100 text-red-800' }
}

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const { addToast } = useToastStore()

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)
  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  const handleSendReminder = (inv: Invoice) => {
    addToast(`Recordatorio enviado a ${inv.client_name}`, 'success')
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} facturas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva factura
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Cobrado</p>
          </div>
          <p className="text-xl font-semibold text-green-700">{formatCurrency(paid)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-gray-500">Por cobrar</p>
          </div>
          <p className="text-xl font-semibold text-amber-700">{formatCurrency(pending)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500">Vencido</p>
          </div>
          <p className="text-xl font-semibold text-red-700">{formatCurrency(overdue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[['all', 'Todas'], ['paid', 'Pagadas'], ['pending', 'Pendientes'], ['overdue', 'Vencidas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === val ? 'bg-brand-400 text-white border-brand-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Invoice list */}
      <div className="flex flex-col gap-2">
        {filtered.map((inv) => (
          <div key={inv.id} className="card p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-gray-400" />
            </div>
            <div className="w-20 flex-shrink-0">
              <span className="text-xs font-mono text-gray-400">{inv.invoice_num}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{inv.client_name}</p>
              <p className="text-xs text-gray-400 truncate">{inv.project}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm text-gray-900">{formatCurrency(inv.amount)}</p>
              <p className="text-xs text-gray-400">Vence: {formatDate(inv.due_date)}</p>
            </div>
            <span className={`badge flex-shrink-0 ${STATUS_CONFIG[inv.status].class}`}>
              {STATUS_CONFIG[inv.status].label}
            </span>
            {inv.status !== 'paid' && (
              <button
                onClick={() => handleSendReminder(inv)}
                className="btn-ghost p-1.5 text-xs flex-shrink-0"
                title="Enviar recordatorio"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <NewInvoiceModal
          onClose={() => setShowModal(false)}
          onCreated={(inv) => {
            setInvoices((prev) => [inv, ...prev])
            addToast('Factura creada', 'success')
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function NewInvoiceModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (inv: Invoice) => void
}) {
  const [form, setForm] = useState({ client_name: '', project: '', amount: '', due_date: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = `INV-${String(Math.floor(Math.random() * 900) + 100)}`
    onCreated({
      id: Math.random().toString(36).slice(2),
      invoice_num: num,
      client_name: form.client_name,
      project: form.project,
      amount: parseFloat(form.amount),
      status: 'pending',
      due_date: form.due_date,
      created_at: new Date().toISOString()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold">Nueva factura</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="label">Cliente</label><input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Nombre del cliente" required /></div>
          <div><label className="label">Proyecto</label><input className="input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Nombre del proyecto" required /></div>
          <div><label className="label">Monto (MXN)</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="25000" min="1" required /></div>
          <div><label className="label">Fecha de vencimiento</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center">Crear factura</button>
          </div>
        </form>
      </div>
    </div>
  )
}

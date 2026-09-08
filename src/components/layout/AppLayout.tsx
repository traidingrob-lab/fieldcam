import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppStore, useToastStore } from '@/store'
import { cn, getInitials } from '@/lib/utils'
import {
  Camera, Folder, Image, CheckSquare, Users,
  FileText, CreditCard, LogOut, Bell, Menu, X, ChevronRight
} from 'lucide-react'

const NAV = [
  { to: '/app/projects', icon: Folder, label: 'Proyectos' },
  { to: '/app/photos', icon: Image, label: 'Fotos' },
  { to: '/app/checklists', icon: CheckSquare, label: 'Checklists' },
  { to: '/app/team', icon: Users, label: 'Equipo' },
  { to: '/app/reports', icon: FileText, label: 'Reportes' },
  { to: '/app/payments', icon: CreditCard, label: 'Pagos' }
]

export default function AppLayout() {
  const { user, signOut } = useAppStore()
  const { toasts, removeToast } = useToastStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const userName = user?.user_metadata?.full_name || user?.email || 'Usuario'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col bg-white border-r border-gray-200 w-56',
      mobile ? 'w-full h-full' : 'hidden lg:flex h-screen sticky top-0'
    )}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center flex-shrink-0">
          <Camera className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-base">FieldCam</span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="section-title px-2 mb-2">Principal</p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-600'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
            {getInitials(userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleSignOut} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" aria-label="Cerrar sesión">
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 animate-slide-in">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 safe-top">
          <button onClick={() => setMobileOpen(true)} className="p-1.5">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-gray-900">FieldCam</span>
          </div>
          <div className="ml-auto">
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium shadow-lg animate-fade-in max-w-xs',
              t.type === 'success' && 'bg-green-600 text-white',
              t.type === 'error' && 'bg-red-600 text-white',
              t.type === 'info' && 'bg-gray-900 text-white'
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

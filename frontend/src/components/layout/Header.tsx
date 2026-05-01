import { Bell, LogOut } from 'lucide-react'
import type { AuthData } from '../../store/authStore'

const ROLE_STYLE: Record<string, string> = {
  admin:   'bg-indigo-100 text-indigo-700 ring-indigo-200',
  waiter:  'bg-emerald-100 text-emerald-700 ring-emerald-200',
  kitchen: 'bg-amber-100 text-amber-700 ring-amber-200',
  manager: 'bg-purple-100 text-purple-700 ring-purple-200',
}

const SECTION_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  orders:    'Orders',
  tables:    'Tables',
  menu:      'Menu Management',
  staff:     'Staff',
  reports:   'Reports',
  settings:  'Settings',
}

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

type HeaderProps = {
  auth: AuthData
  activeSection: string
  onLogout: () => void
}

export function Header({ auth, activeSection, onLogout }: HeaderProps) {
  const roleStyle = ROLE_STYLE[auth.user.role] ?? 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-800">{auth.tenant.name}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{SECTION_LABEL[activeSection] ?? 'Dashboard'}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
        </button>

        {/* Role badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ring-1 ${roleStyle}`}>
          {auth.user.role}
        </span>

        {/* Avatar */}
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white text-[11px] font-bold">{initials(auth.user.email)}</span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 ml-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  )
}

import { Bell, LogOut, Menu } from 'lucide-react'
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
  menu:      'Menu',
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
  /** Opens the mobile navigation drawer (shown only below `lg`). */
  onMenuClick?: () => void
}

export function Header({ auth, activeSection, onLogout, onMenuClick }: HeaderProps) {
  const roleStyle = ROLE_STYLE[auth.user.role] ?? 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <header className="min-h-14 sm:h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-0 pt-safe lg:pt-0">
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden shrink-0 p-2.5 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 touch-manipulation"
            aria-label="Open navigation menu"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        )}
        <div className="min-w-0 flex flex-col sm:block">
          <span className="sm:hidden text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            {SECTION_LABEL[activeSection] ?? 'Dashboard'}
          </span>
          <div className="hidden sm:flex items-center gap-2 text-sm min-w-0">
            <span className="font-semibold text-slate-800 truncate">{auth.tenant.name}</span>
            <span className="text-slate-300 shrink-0">/</span>
            <span className="text-slate-500 whitespace-nowrap">
              {SECTION_LABEL[activeSection] ?? 'Dashboard'}
            </span>
          </div>
          <span className="truncate text-sm font-semibold text-slate-800 sm:hidden mt-0.5">
            {auth.tenant.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          className="relative p-2.5 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl sm:rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors touch-manipulation hidden sm:flex"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
        </button>

        <span
          className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold capitalize ring-1 max-w-[6rem] sm:max-w-none truncate ${roleStyle}`}
        >
          {auth.user.role}
        </span>

        <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-bold">{initials(auth.user.email)}</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl sm:rounded-lg transition-colors touch-manipulation"
          aria-label="Log out"
        >
          <LogOut size={18} className="sm:w-[14px] sm:h-[14px]" />
          <span className="hidden sm:inline text-sm">Logout</span>
        </button>
      </div>
    </header>
  )
}

import {
  LayoutDashboard, ShoppingBag, LayoutGrid, UtensilsCrossed,
  Users, BarChart3, Settings, ChefHat,
} from 'lucide-react'
import { NAV_IDS_BY_ROLE } from '../../constants/navByRole'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: ShoppingBag,     label: 'Orders',    id: 'orders'    },
  { icon: LayoutGrid,      label: 'Tables',    id: 'tables'    },
  { icon: UtensilsCrossed, label: 'Menu',      id: 'menu'      },
  { icon: Users,           label: 'Staff',     id: 'staff'     },
  { icon: BarChart3,       label: 'Reports',   id: 'reports'   },
] as const

type SidebarProps = {
  role: string
  activeSection: string
  onNavigate: (section: string) => void
  /** When false on small screens, drawer is off-canvas; always visible on `lg+`. */
  mobileOpen?: boolean
}

export function Sidebar({ role, activeSection, onNavigate, mobileOpen = false }: SidebarProps) {
  const allowed = new Set(NAV_IDS_BY_ROLE[role] ?? NAV_IDS_BY_ROLE.waiter)
  const mainItems = NAV_ITEMS.filter((item) => allowed.has(item.id))
  const showSettings = role === 'admin'

  return (
    <aside
      className={`
        flex flex-col bg-[#0f172a] w-64 max-w-[min(18rem,calc(100vw-3rem))] flex-shrink-0
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        transform transition-transform duration-200 ease-out motion-reduce:transition-none
        shadow-2xl lg:shadow-none
        pt-safe lg:pt-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="flex items-center gap-3 px-5 py-4 sm:py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <ChefHat size={17} className="text-white" />
        </div>
        <span className="text-white font-semibold text-[17px] tracking-tight truncate">DineOps</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overscroll-contain min-h-0 pb-safe lg:pb-4">
        <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Main
        </p>
        {mainItems.map(({ icon: Icon, label, id }) => {
          const active = activeSection === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-12 sm:min-h-0 touch-manipulation ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-800'
              }`}
            >
              <Icon size={18} className={`shrink-0 ${active ? 'text-indigo-200' : 'text-slate-500'}`} />
              {label}
            </button>
          )
        })}

        {showSettings && (
          <div className="pt-4">
            <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              System
            </p>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-12 sm:min-h-0 touch-manipulation ${
                activeSection === 'settings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-800'
              }`}
            >
              <Settings
                size={18}
                className={`shrink-0 ${activeSection === 'settings' ? 'text-indigo-200' : 'text-slate-500'}`}
              />
              Settings
            </button>
          </div>
        )}
      </nav>

      <div className="px-5 py-3 sm:py-4 border-t border-slate-800 pb-safe lg:pb-4">
        <p className="text-[11px] text-slate-600">v1.0.0 — MVP Build</p>
      </div>
    </aside>
  )
}

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
}

export function Sidebar({ role, activeSection, onNavigate }: SidebarProps) {
  const allowed = new Set(NAV_IDS_BY_ROLE[role] ?? NAV_IDS_BY_ROLE.waiter)
  const mainItems = NAV_ITEMS.filter((item) => allowed.has(item.id))
  const showSettings = role === 'admin'

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen bg-[#0f172a]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <ChefHat size={17} className="text-white" />
        </div>
        <span className="text-white font-semibold text-[17px] tracking-tight">DineOps</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Main
        </p>
        {mainItems.map(({ icon: Icon, label, id }) => {
          const active = activeSection === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon size={16} className={active ? 'text-indigo-200' : 'text-slate-500'} />
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
              onClick={() => onNavigate('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeSection === 'settings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Settings
                size={16}
                className={activeSection === 'settings' ? 'text-indigo-200' : 'text-slate-500'}
              />
              Settings
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800">
        <p className="text-[11px] text-slate-600">v1.0.0 — MVP Build</p>
      </div>
    </aside>
  )
}

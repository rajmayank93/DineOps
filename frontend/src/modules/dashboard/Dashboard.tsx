import { useState, useEffect, type ElementType } from 'react'
import {
  DollarSign, LayoutGrid, ShoppingBag, Users,
  TrendingUp, TrendingDown, Minus, RefreshCw, Plus, ArrowRight,
} from 'lucide-react'
import { SkeletonCard, SkeletonTableRow } from '../../components/ui/Skeleton'
import type { AuthData } from '../../store/authStore'

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'in-progress' | 'served' | 'cancelled'

type Order = {
  id: string
  table: string
  items: string
  total: string
  status: OrderStatus
  time: string
}

type StatConfig = {
  label: string
  value: string
  sub: string
  trend: 'up' | 'down' | 'neutral'
  icon: ElementType
  iconBg: string
  iconColor: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const STATS: StatConfig[] = [
  {
    label: "Today's Revenue", value: '$2,847', sub: '+12% from yesterday',
    trend: 'up', icon: DollarSign, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
  },
  {
    label: 'Active Tables', value: '12 / 20', sub: '60% occupancy rate',
    trend: 'neutral', icon: LayoutGrid, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
  },
  {
    label: 'Pending Orders', value: '7', sub: '3 require urgent attention',
    trend: 'down', icon: ShoppingBag, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
  },
  {
    label: 'Staff Online', value: '8 / 10', sub: '2 currently on break',
    trend: 'neutral', icon: Users, iconBg: 'bg-slate-100', iconColor: 'text-slate-600',
  },
]

const ORDERS: Order[] = [
  { id: '#1042', table: 'Table 3', items: 'Margherita Pizza, Coke',            total: '$24.50', status: 'served',      time: '2m ago'  },
  { id: '#1041', table: 'Table 7', items: 'Pasta Arrabiata, House Wine',       total: '$38.00', status: 'in-progress', time: '8m ago'  },
  { id: '#1040', table: 'Table 1', items: 'Caesar Salad, Sparkling Water',     total: '$16.75', status: 'pending',     time: '15m ago' },
  { id: '#1039', table: 'Table 5', items: 'Ribeye Steak, Craft Beer',          total: '$67.20', status: 'served',      time: '22m ago' },
  { id: '#1038', table: 'Table 2', items: 'Tiramisu, Espresso',                total: '$19.00', status: 'cancelled',   time: '31m ago' },
]

const STATUS_CFG: Record<OrderStatus, { label: string; className: string }> = {
  pending:     { label: 'Pending',     className: 'bg-amber-50   text-amber-700  ring-1 ring-amber-200'   },
  'in-progress': { label: 'In Progress', className: 'bg-blue-50    text-blue-700   ring-1 ring-blue-200'    },
  served:      { label: 'Served',      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-50     text-red-600    ring-1 ring-red-200'     },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ stat }: { stat: StatConfig }) {
  const { label, value, sub, trend, icon: Icon, iconBg, iconColor } = stat
  return (
    <div className="bg-white rounded-lg shadow-card p-5 hover:shadow-card-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{value}</p>
        </div>
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {trend === 'up'      && <TrendingUp   size={12} className="text-emerald-500" />}
        {trend === 'down'    && <TrendingDown size={12} className="text-red-400"     />}
        {trend === 'neutral' && <Minus        size={12} className="text-slate-400"   />}
        <span className={`text-xs ${
          trend === 'up'   ? 'text-emerald-600' :
          trend === 'down' ? 'text-red-500'     : 'text-slate-400'
        }`}>
          {sub}
        </span>
      </div>
    </div>
  )
}

function QuickAction({
  icon: Icon, label, sub, primary = false,
}: {
  icon: ElementType; label: string; sub: string; primary?: boolean
}) {
  return (
    <button className={`rounded-lg p-5 text-left w-full transition-all hover:shadow-card-md ${
      primary
        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
        : 'bg-white shadow-card hover:bg-slate-50'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
        primary ? 'bg-white/20' : 'bg-slate-100'
      }`}>
        <Icon size={16} className={primary ? 'text-white' : 'text-slate-600'} />
      </div>
      <p className={`font-semibold text-sm ${primary ? 'text-white' : 'text-slate-800'}`}>{label}</p>
      <p className={`text-xs mt-0.5 ${primary ? 'text-indigo-200' : 'text-slate-400'}`}>{sub}</p>
    </button>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard({ auth }: { auth: AuthData }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1600)
    return () => clearTimeout(t)
  }, [])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = auth.user.email.split('@')[0]

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting},{' '}
          <span className="capitalize">{firstName}</span> 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Here's what's happening at{' '}
          <span className="font-medium text-slate-700">{auth.tenant.name}</span> today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : STATS.map((s) => <StatCard key={s.label} stat={s} />)}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-[15px]">Recent Orders</h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 5 orders across all tables</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-1">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="px-6 py-2.5 grid grid-cols-[72px_96px_1fr_88px_128px_72px] gap-4 border-b border-slate-100 bg-slate-50">
              {['Order', 'Table', 'Items', 'Total', 'Status', 'Time'].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  {h}
                </span>
              ))}
            </div>

            {ORDERS.map((order) => {
              const cfg = STATUS_CFG[order.status]
              return (
                <div
                  key={order.id}
                  className="px-6 py-3.5 grid grid-cols-[72px_96px_1fr_88px_128px_72px] gap-4 items-center hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-semibold text-slate-800">{order.id}</span>
                  <span className="text-sm text-slate-600">{order.table}</span>
                  <span className="text-sm text-slate-500 truncate">{order.items}</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{order.total}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-slate-400">{order.time}</span>
                </div>
              )
            })}

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <button className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                View all orders <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      {!loading && (
        <div>
          <h2 className="font-semibold text-slate-900 text-[15px] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            <QuickAction icon={Plus}       label="New Order"       sub="Start a new table order"   primary />
            <QuickAction icon={LayoutGrid} label="Table Overview"  sub="See floor status & map"           />
            <QuickAction icon={ShoppingBag} label="Manage Menu"    sub="Edit items & pricing"             />
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState, type ElementType } from 'react'
import axios from 'axios'
import {
  DollarSign, LayoutGrid, ShoppingBag, Users,
  TrendingUp, TrendingDown, Minus, RefreshCw, Plus, ArrowRight,
} from 'lucide-react'
import { SkeletonCard, SkeletonTableRow } from '../../components/ui/Skeleton'
import type { AuthData } from '../../store/authStore'
import { fetchDashboard, type DashboardRecentOrder } from '../../services/api'
import { formatInr } from '../../utils/money'

type Props = { auth: AuthData; onNavigate: (section: string) => void }

type StatConfig = {
  label: string
  value: string
  sub: string
  trend: 'up' | 'down' | 'neutral'
  icon: ElementType
  iconBg: string
  iconColor: string
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  return `${days}d ago`
}

const STATUS_UI: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-50   text-amber-700  ring-1 ring-amber-200' },
  preparing: { label: 'Preparing', className: 'bg-blue-50    text-blue-700   ring-1 ring-blue-200'  },
  ready:     { label: 'Ready',     className: 'bg-cyan-50    text-cyan-700   ring-1 ring-cyan-200'  },
  served:    { label: 'Served',    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
}

function statusCfg(status: string) {
  return STATUS_UI[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  }
}

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
  icon: Icon, label, sub, primary = false, onClick,
}: {
  icon: ElementType
  label: string
  sub: string
  primary?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg p-5 text-left w-full transition-all hover:shadow-card-md min-h-[3.25rem] sm:min-h-0 active:opacity-95 touch-manipulation ${
        primary
          ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
          : 'bg-white shadow-card hover:bg-slate-50'
      }`}
    >
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

function buildStats(summary: {
  revenueToday: string
  revenueTrendPct: number | null
  tablesActive: number
  tablesTotal: number
  openOrders: number
  staffActive: number
}): StatConfig[] {
  const rev = Number(summary.revenueToday)
  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  let sub = 'vs yesterday (served orders, UTC day)'
  if (summary.revenueTrendPct != null) {
    if (summary.revenueTrendPct > 0.5) {
      trend = 'up'
      sub = `Up ${summary.revenueTrendPct.toFixed(1)}% vs yesterday`
    } else if (summary.revenueTrendPct < -0.5) {
      trend = 'down'
      sub = `Down ${Math.abs(summary.revenueTrendPct).toFixed(1)}% vs yesterday`
    } else {
      sub = 'Flat vs yesterday'
    }
  }

  const occ =
    summary.tablesTotal === 0
      ? 'Add tables to track occupancy'
      : `${Math.round((summary.tablesActive / summary.tablesTotal) * 100)}% busy (${summary.tablesActive}/${summary.tablesTotal})`

  return [
    {
      label: "Today's revenue (served)",
      value: Number.isFinite(rev) ? formatInr(rev) : formatInr(0),
      sub,
      trend,
      icon: DollarSign,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Tables active / total',
      value: summary.tablesTotal === 0 ? '—' : `${summary.tablesActive} / ${summary.tablesTotal}`,
      sub: occ,
      trend: 'neutral',
      icon: LayoutGrid,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Open orders',
      value: String(summary.openOrders),
      sub: 'Pending, preparing, or ready',
      trend: summary.openOrders > 3 ? 'down' : 'neutral',
      icon: ShoppingBag,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Team accounts',
      value: String(summary.staffActive),
      sub: 'Active users in this restaurant',
      trend: 'neutral',
      icon: Users,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
  ]
}

export function Dashboard({ auth, onNavigate }: Props) {
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [stats, setStats]         = useState<StatConfig[]>([])
  const [recent, setRecent]       = useState<DashboardRecentOrder[]>([])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await fetchDashboard()
      setStats(buildStats(data.summary))
      setRecent(data.recentOrders)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message
        setError(msg ?? 'Could not load dashboard.')
      } else {
        setError('Could not load dashboard.')
      }
      setStats([])
      setRecent([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = auth.user.email.split('@')[0]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
          {greeting},{' '}
          <span className="capitalize">{firstName}</span> 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Live snapshot for{' '}
          <span className="font-medium text-slate-700">{auth.tenant.name}</span>
          {' '}— revenue counts <span className="font-medium">served</span> orders (UTC calendar day).
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((s) => <StatCard key={s.label} stat={s} />)}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900 text-[15px]">Recent orders</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest 5 across all tables</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-2 touch-manipulation min-h-11 sm:min-h-0 sm:py-0"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-1">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)}
          </div>
        ) : recent.length === 0 ? (
          <p className="p-6 sm:p-8 text-sm text-slate-400 text-center">No orders yet.</p>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {recent.map((order) => {
                const cfg = statusCfg(order.status)
                return (
                  <div key={order.id} className="px-4 py-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-800">#{order.shortId}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{order.tableLabel}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{order.itemsSummary}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold tabular-nums">{formatInr(order.total)}</span>
                      <span className="text-xs text-slate-400">{formatRelativeTime(order.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table row layout */}
            <div className="hidden md:block">
            <div className="px-6 py-2.5 grid grid-cols-[88px_88px_1fr_88px_128px_72px] gap-4 border-b border-slate-100 bg-slate-50">
              {['Order', 'Table', 'Items', 'Total', 'Status', 'Time'].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  {h}
                </span>
              ))}
            </div>

            {recent.map((order) => {
              const cfg = statusCfg(order.status)
              return (
                <div
                  key={order.id}
                  className="px-6 py-3.5 grid grid-cols-[88px_88px_1fr_88px_128px_72px] gap-4 items-center hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-semibold text-slate-800 font-mono">#{order.shortId}</span>
                  <span className="text-sm text-slate-600">{order.tableLabel}</span>
                  <span className="text-sm text-slate-500 truncate" title={order.itemsSummary}>
                    {order.itemsSummary}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {formatInr(order.total)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-slate-400">{formatRelativeTime(order.createdAt)}</span>
                </div>
              )
            })}

            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-2 touch-manipulation min-h-11 sm:min-h-0"
              >
                View all orders <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div>
          <h2 className="font-semibold text-slate-900 text-[15px] mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickAction
              icon={Plus}
              label="New order"
              sub="Create an order for a table"
              primary
              onClick={() => onNavigate('orders')}
            />
            <QuickAction
              icon={LayoutGrid}
              label="Tables"
              sub="Floor and table status"
              onClick={() => onNavigate('tables')}
            />
            <QuickAction
              icon={ShoppingBag}
              label="Menu"
              sub="Items and pricing"
              onClick={() => onNavigate('menu')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

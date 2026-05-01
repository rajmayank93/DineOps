import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { BarChart3 } from 'lucide-react'
import { fetchAnalyticsReports, type ReportDay, type TopItem } from '../../services/api'
import { formatInr } from '../../utils/money'

export function Reports() {
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [byDay, setByDay]       = useState<ReportDay[]>([])
  const [rangeDays, setRangeDays] = useState(7)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await fetchAnalyticsReports()
      setTopItems(data.topItems)
      setByDay(data.ordersByDay)
      setRangeDays(data.rangeDays)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not load reports.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const maxOrders = Math.max(1, ...byDay.map((d) => d.orderCount))

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 size={26} className="text-indigo-600" />
          Reports
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Last {rangeDays} days (UTC). Order volume is all orders; revenue is from <span className="font-medium">served</span> orders only.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-card p-6">
            <h2 className="font-semibold text-slate-900 text-[15px] mb-4">Orders per day</h2>
            <div className="flex items-end gap-2 h-44">
              {byDay.map((d) => {
                const pct = maxOrders > 0 ? d.orderCount / maxOrders : 0
                const barH = Math.max(10, Math.round(pct * 128))
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end min-w-0 h-full">
                    <span className="text-[11px] font-semibold text-slate-700 mb-1 tabular-nums">{d.orderCount}</span>
                    <div
                      className="w-full max-w-[48px] rounded-t-md bg-indigo-500/90 shrink-0"
                      style={{ height: barH }}
                      title={`${d.orderCount} orders, ${formatInr(d.servedRevenue)} served revenue`}
                    />
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center" title={d.date}>
                      {d.date.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Served revenue by day (same window):{' '}
              {byDay.map((d) => `${d.date}: ${formatInr(d.servedRevenue)}`).join(' · ') || '—'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-[15px]">Top items (served)</h2>
              <p className="text-xs text-slate-400 mt-0.5">By quantity sold in the last {rangeDays} days</p>
            </div>
            {topItems.length === 0 ? (
              <p className="p-8 text-sm text-slate-400 text-center">No served orders in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-4 py-2.5 font-semibold text-slate-500">Item</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500">Qty</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((row) => (
                    <tr key={row.itemName} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.itemName}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{row.quantity}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                        {formatInr(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

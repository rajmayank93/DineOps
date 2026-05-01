import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { ShoppingBag, Plus } from 'lucide-react'
import {
  advanceOrderStatus,
  createOrder,
  fetchMenu,
  listOrders,
  listTables,
  type MenuItemDto,
  type OrderDto,
  type FloorTable,
} from '../../services/api'
import { formatInr } from '../../utils/money'

type Props = { role: string }

const canAdvance = (role: string, status: string) => {
  if (status === 'served') return false
  if (status === 'pending') return role === 'kitchen' || role === 'admin'
  if (status === 'preparing') return role === 'kitchen' || role === 'admin'
  if (status === 'ready') return role === 'waiter' || role === 'admin'
  return false
}

const advanceLabel = (status: string) => {
  if (status === 'pending') return 'Send to kitchen (preparing)'
  if (status === 'preparing') return 'Mark ready'
  if (status === 'ready') return 'Mark served'
  return 'Advance'
}

export function Orders({ role }: Props) {
  const [orders, setOrders]       = useState<OrderDto[]>([])
  const [tables, setTables]       = useState<FloorTable[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([])
  const [filter, setFilter]      = useState<string>('')
  const [loading, setLoading]    = useState(true)
  const [error, setError]        = useState('')

  const [modal, setModal]        = useState(false)
  const [tableId, setTableId]     = useState('')
  const [notes, setNotes]        = useState('')
  const [lines, setLines]        = useState<{ menuItemId: string; quantity: number }[]>([])

  const canCreate = role === 'admin' || role === 'waiter'

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [o, t, menu] = await Promise.all([
        listOrders(filter ? { status: filter } : undefined),
        listTables(),
        fetchMenu(),
      ])
      setOrders(o)
      setTables(t)
      setMenuItems(menu.items.filter((i) => i.isAvailable))
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not load orders.')
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  function openNewOrder() {
    setTableId(tables[0]?.id ?? '')
    setNotes('')
    const first = menuItems[0]?.id
    setLines(first ? [{ menuItemId: first, quantity: 1 }] : [])
    setModal(true)
  }

  function addLine() {
    const first = menuItems[0]?.id
    if (!first) return
    setLines((prev) => [...prev, { menuItemId: first, quantity: 1 }])
  }

  function setLine(i: number, field: 'menuItemId' | 'quantity', v: string) {
    setLines((prev) => {
      const next = [...prev]
      const row = { ...next[i] }
      if (field === 'menuItemId') row.menuItemId = v
      if (field === 'quantity') row.quantity = Math.max(1, Math.floor(Number(v)) || 1)
      next[i] = row
      return next
    })
  }

  async function submitOrder(e: FormEvent) {
    e.preventDefault()
    if (!tableId || !lines.length) return
    setError('')
    try {
      await createOrder({ tableId, items: lines, notes: notes.trim() || undefined })
      setModal(false)
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not create order.')
      }
    }
  }

  async function advance(id: string) {
    setError('')
    try {
      await advanceOrderStatus(id)
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not update status.')
      }
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag size={24} className="text-indigo-600" />
            Orders
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kitchen flow: pending → preparing → ready → served.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
          </select>
          {canCreate && (
            <button
              type="button"
              onClick={openNewOrder}
              disabled={!tables.length || !menuItems.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700 disabled:opacity-40"
            >
              <Plus size={16} />
              New order
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-card p-10 text-center text-slate-400 text-sm">No orders match.</div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="bg-white rounded-lg shadow-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    #{o.id.slice(0, 8)} · {o.tableLabel}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(o.createdAt).toLocaleString()} · menu v{o.menuVersion}
                  </p>
                  <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {o.status}
                  </span>
                </div>
                {canAdvance(role, o.status) && (
                  <button
                    type="button"
                    onClick={() => advance(o.id)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {advanceLabel(o.status)}
                  </button>
                )}
              </div>
              <ul className="mt-3 border-t border-slate-100 pt-3 space-y-1">
                {o.items.map((li) => (
                  <li key={li.id} className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{li.quantity}×</span> {li.itemName}{' '}
                    @ {formatInr(li.unitPrice)}
                    {li.note ? <span className="text-slate-400"> ({li.note})</span> : null}
                  </li>
                ))}
              </ul>
              {o.notes && <p className="text-xs text-slate-500 mt-2">Note: {o.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-900">New order</h2>
            <form onSubmit={submitOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Table</label>
                <select
                  required
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Items</label>
                {lines.map((line, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select
                      value={line.menuItemId}
                      onChange={(e) => setLine(i, 'menuItemId', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatInr(m.price)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => setLine(i, 'quantity', e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <button type="button" onClick={addLine} className="text-xs font-semibold text-indigo-600">
                  + Add line
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Order notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

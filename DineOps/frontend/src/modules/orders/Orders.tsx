import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { ShoppingBag, Plus } from 'lucide-react'
import {
  advanceOrderStatus,
  createBill,
  createOrder,
  fetchBill,
  fetchMenu,
  listOrders,
  listTables,
  payBill,
  type MenuItemDto,
  type OrderDto,
  type FloorTable,
} from '../../services/api'
import { formatInr } from '../../utils/money'
import { printPlainText } from '../../utils/printPlainText'

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

type BillingModal =
  | { status: 'loading' }
  | { status: 'new'; orderId: string; tableLabel: string; taxRate: string }
  | { status: 'receipt'; billId: string; tableLabel: string; text: string; canPay: boolean }

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

  const [billing, setBilling] = useState<BillingModal | null>(null)

  const canCreate = role === 'admin' || role === 'waiter'
  const canManageBilling = canCreate

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

  async function openBilling(order: OrderDto) {
    if (!canManageBilling || order.status !== 'served') return
    setError('')
    if (!order.bill) {
      setBilling({ status: 'new', orderId: order.id, tableLabel: order.tableLabel, taxRate: '5' })
      return
    }
    setBilling({ status: 'loading' })
    try {
      const b = await fetchBill(order.bill.id)
      setBilling({
        status: 'receipt',
        billId: b.id,
        tableLabel: order.tableLabel,
        text: b.receiptText,
        canPay: !b.paidAt,
      })
    } catch (err) {
      setBilling(null)
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not load bill.')
      }
    }
  }

  async function submitCreateBill(e: FormEvent) {
    e.preventDefault()
    if (billing?.status !== 'new') return
    const tax = Number(billing.taxRate)
    if (Number.isNaN(tax) || tax < 0 || tax > 100) {
      setError('Tax rate must be between 0 and 100.')
      return
    }
    setError('')
    try {
      const b = await createBill({ orderId: billing.orderId, taxRate: tax })
      setBilling({
        status: 'receipt',
        billId: b.id,
        tableLabel: billing.tableLabel,
        text: b.receiptText,
        canPay: !b.paidAt,
      })
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not create bill.')
      }
    }
  }

  async function markPaid() {
    if (billing?.status !== 'receipt' || !billing.canPay) return
    setError('')
    try {
      const b = await payBill(billing.billId)
      setBilling({
        status: 'receipt',
        billId: b.id,
        tableLabel: billing.tableLabel,
        text: b.receiptText,
        canPay: !b.paidAt,
      })
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not record payment.')
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-6 mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag size={22} className="text-indigo-600 shrink-0 sm:w-6 sm:h-6" />
            Orders
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kitchen flow: pending → preparing → ready → served.</p>
        </div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2.5 sm:py-2 bg-white w-full sm:w-auto min-h-11 sm:min-h-0"
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
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-3 sm:py-2 hover:bg-indigo-700 disabled:opacity-40 w-full sm:w-auto min-h-11 sm:min-h-0 touch-manipulation"
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
            <li key={o.id} className="bg-white rounded-lg shadow-card p-4 sm:p-5">
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
                  {o.bill ? (
                    <p className="text-xs text-slate-600 mt-2">
                      Bill {formatInr(o.bill.total)}
                      {o.bill.paidAt ? (
                        <span className="ml-2 text-emerald-700 font-semibold">Paid</span>
                      ) : (
                        <span className="ml-2 text-amber-700 font-semibold">Unpaid</span>
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
                {canAdvance(role, o.status) && (
                  <button
                    type="button"
                    onClick={() => advance(o.id)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 py-2 px-1 -mr-1 rounded-lg active:bg-indigo-50 touch-manipulation text-left sm:text-right"
                  >
                    {advanceLabel(o.status)}
                  </button>
                )}
                {canManageBilling && o.status === 'served' && (
                  <button
                    type="button"
                    onClick={() => void openBilling(o)}
                    className="text-sm font-semibold text-slate-800 hover:text-slate-950 py-2 px-1 -mr-1 rounded-lg active:bg-slate-100 touch-manipulation text-left sm:text-right border border-slate-200 sm:border-0"
                  >
                    {o.bill ? (o.bill.paidAt ? 'View receipt' : 'Receipt / pay') : 'Create bill'}
                  </button>
                )}
                </div>
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
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center sm:p-4 bg-black/40">
          <div className="bg-white flex flex-col flex-1 sm:flex-none sm:max-w-lg sm:max-h-[90vh] sm:rounded-xl shadow-xl w-full max-h-[100dvh] overflow-y-auto overscroll-contain p-4 sm:p-6 pb-safe sm:pb-6 pt-4 sm:pt-6">
            <h2 className="text-lg font-bold text-slate-900 shrink-0">New order</h2>
            <form onSubmit={submitOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Table</label>
                <select
                  required
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm min-h-11"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Items</label>
                {lines.map((line, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-2">
                    <select
                      value={line.menuItemId}
                      onChange={(e) => setLine(i, 'menuItemId', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2.5 sm:py-1.5 text-sm min-h-11 sm:min-h-0 w-full"
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
                      className="w-full sm:w-20 rounded-lg border border-slate-200 px-2 py-2.5 sm:py-1.5 text-sm min-h-11 sm:min-h-0"
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm min-h-11"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 sm:pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="px-4 py-3 sm:py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg touch-manipulation min-h-11 sm:min-h-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 sm:py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 touch-manipulation min-h-11 sm:min-h-0"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {billing && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center sm:p-4 bg-black/40">
          <div className="bg-white flex flex-col flex-1 sm:flex-none sm:w-full sm:max-w-md sm:max-h-[90vh] sm:rounded-xl shadow-xl w-full max-h-[100dvh] overflow-y-auto overscroll-contain p-4 sm:p-6 pb-safe sm:pb-6">
            <h2 className="text-lg font-bold text-slate-900 shrink-0">
              {billing.status === 'new' ? 'New bill' : 'Receipt'}
            </h2>
            {billing.status === 'loading' && (
              <p className="text-sm text-slate-500 mt-4">Loading bill…</p>
            )}
            {billing.status === 'new' && (
              <form onSubmit={submitCreateBill} className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Table <span className="font-semibold text-slate-900">{billing.tableLabel}</span> — set tax % for this
                  bill.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tax rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={billing.taxRate}
                    onChange={(e) =>
                      setBilling({ ...billing, taxRate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm min-h-11"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBilling(null)}
                    className="px-4 py-3 sm:py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg min-h-11 sm:min-h-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-3 sm:py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 min-h-11 sm:min-h-0"
                  >
                    Generate receipt
                  </button>
                </div>
              </form>
            )}
            {billing.status === 'receipt' && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Table <span className="font-semibold text-slate-900">{billing.tableLabel}</span>
                </p>
                <pre className="text-xs sm:text-sm leading-snug bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono text-slate-800">
                  {billing.text}
                </pre>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => printPlainText(billing.text)}
                    className="px-4 py-3 sm:py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 min-h-11 sm:min-h-0 touch-manipulation"
                  >
                    Print
                  </button>
                  {billing.canPay && (
                    <button
                      type="button"
                      onClick={() => void markPaid()}
                      className="px-4 py-3 sm:py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 min-h-11 sm:min-h-0 touch-manipulation"
                    >
                      Mark paid
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBilling(null)}
                    className="px-4 py-3 sm:py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg min-h-11 sm:min-h-0 touch-manipulation sm:ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

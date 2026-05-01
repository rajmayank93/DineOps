import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Plus, Trash2 } from 'lucide-react'
import {
  createTable,
  deleteTable,
  listTables,
  setTableStatus,
  updateTable,
  type FloorTable,
} from '../../services/api'

const STATUSES = ['empty', 'occupied', 'bill_pending'] as const

type Props = { role: string }

const isAdmin = (role: string) => role === 'admin'

export function Tables({ role }: Props) {
  const [tables, setTables]         = useState<FloorTable[]>([])
  const [loading, setLoading]      = useState(true)
  const [error, setError]          = useState('')
  const [label, setLabel]          = useState('')
  const [capacity, setCapacity]    = useState(4)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      setTables(await listTables())
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not load tables.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setError('')
    try {
      await createTable({ label: label.trim(), capacity: Number(capacity) || 4 })
      setLabel('')
      setCapacity(4)
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not add table.')
      }
    }
  }

  async function saveRow(t: FloorTable, nextLabel: string, nextCap: string) {
    setError('')
    try {
      await updateTable(t.id, { label: nextLabel.trim(), capacity: Number(nextCap) || 1 })
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not update.')
      }
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this table?')) return
    setError('')
    try {
      await deleteTable(id)
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not delete.')
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-8 mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tables</h1>
        <p className="text-slate-500 text-sm mt-1">Floor layout — labels must be unique per restaurant.</p>
      </div>

      {isAdmin(role) && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg shadow-card p-4 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. T1, Patio 2"
              className="rounded-lg border border-slate-200 px-3 py-2.5 sm:py-2 text-sm w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 min-h-11 sm:min-h-0"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Seats</label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2.5 sm:py-2 text-sm w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 min-h-11 sm:min-h-0"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-3 sm:py-2 hover:bg-indigo-700 touch-manipulation w-full sm:w-auto min-h-11 sm:min-h-0"
          >
            <Plus size={16} />
            Add table
          </button>
        </form>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="bg-white rounded-lg shadow-card overflow-hidden -mx-4 sm:mx-0">
        {loading ? (
          <p className="p-8 text-sm text-slate-400">Loading…</p>
        ) : tables.length === 0 ? (
          <p className="p-8 text-sm text-slate-400">No tables yet.{isAdmin(role) ? ' Add one above.' : ''}</p>
        ) : (
          <div className="overflow-x-auto touch-pan-x">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Label</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Seats</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Status</th>
                {isAdmin(role) && (
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500">Edit</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <TableRow
                  key={t.id}
                  table={t}
                  role={role}
                  onSave={saveRow}
                  onDelete={remove}
                  onStatusChange={async (id, st) => {
                    setError('')
                    try {
                      await setTableStatus(id, st)
                      await load()
                    } catch (err) {
                      if (axios.isAxiosError(err)) {
                        setError((err.response?.data as { message?: string })?.message ?? 'Could not update status.')
                      }
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

function TableRow({
  table,
  role,
  onSave,
  onDelete,
  onStatusChange,
}: {
  table: FloorTable
  role: string
  onSave: (t: FloorTable, label: string, cap: string) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, st: typeof STATUSES[number]) => void
}) {
  const [editLabel, setEditLabel]     = useState(table.label)
  const [editCap, setEditCap]         = useState(String(table.capacity))
  const admin = role === 'admin'
  const canStatus = role === 'admin' || role === 'waiter'

  useEffect(() => {
    setEditLabel(table.label)
    setEditCap(String(table.capacity))
  }, [table.label, table.capacity])

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-4 py-3">
        {admin ? (
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 w-full max-w-[160px]"
          />
        ) : (
          <span className="font-medium text-slate-800">{table.label}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {admin ? (
          <input
            type="number"
            min={1}
            value={editCap}
            onChange={(e) => setEditCap(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 w-20"
          />
        ) : (
          <span className="text-slate-600">{table.capacity}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {canStatus ? (
          <select
            value={table.status}
            onChange={(e) => onStatusChange(table.id, e.target.value as typeof STATUSES[number])}
            className="rounded-lg border border-slate-200 px-2 py-2 sm:py-1 text-xs capitalize bg-white min-h-11 sm:min-h-0 w-full sm:w-auto touch-manipulation"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs capitalize text-slate-600">{table.status.replace('_', ' ')}</span>
        )}
      </td>
      {admin && (
        <td className="px-4 py-3 text-right space-x-2">
          <button
            type="button"
            onClick={() => onSave(table, editLabel, editCap)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => onDelete(table.id)}
            className="inline-flex items-center text-xs text-red-600 hover:text-red-800"
          >
            <Trash2 size={14} className="mr-0.5" />
            Delete
          </button>
        </td>
      )}
    </tr>
  )
}

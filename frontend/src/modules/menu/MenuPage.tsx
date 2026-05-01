import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { UtensilsCrossed } from 'lucide-react'
import {
  createMenuItem,
  deleteMenuItem,
  fetchMenu,
  updateMenuItem,
  type MenuItemDto,
} from '../../services/api'
import { formatInr } from '../../utils/money'

type Props = { role: string }

const isAdmin = (role: string) => role === 'admin'

function groupByCategory(items: MenuItemDto[]) {
  const m = new Map<string, MenuItemDto[]>()
  for (const i of items) {
    const list = m.get(i.category) ?? []
    list.push(i)
    m.set(i.category, list)
  }
  return m
}

export function MenuPage({ role }: Props) {
  const [version, setVersion]     = useState(0)
  const [items, setItems]         = useState<MenuItemDto[]>([])
  const [loading, setLoading]    = useState(true)
  const [error, setError]        = useState('')
  const [cat, setCat]            = useState('')
  const [name, setName]         = useState('')
  const [price, setPrice]       = useState('')
  const [desc, setDesc]         = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await fetchMenu()
      setVersion(data.version)
      setItems(data.items)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not load menu.')
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
    if (!cat.trim() || !name.trim() || !price) return
    const p = Number(price)
    if (Number.isNaN(p) || p < 0) {
      setError('Enter a valid price.')
      return
    }
    setError('')
    try {
      await createMenuItem({ category: cat.trim(), name: name.trim(), description: desc.trim() || null, price: p })
      setCat('')
      setName('')
      setPrice('')
      setDesc('')
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not add item.')
      }
    }
  }

  async function toggleAvailable(it: MenuItemDto) {
    if (!isAdmin(role)) return
    setError('')
    try {
      await updateMenuItem(it.id, { isAvailable: !it.isAvailable })
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Update failed.')
      }
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this menu item?')) return
    setError('')
    try {
      await deleteMenuItem(id)
      await load()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Could not delete.')
      }
    }
  }

  const grouped = groupByCategory(items)

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-8 mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UtensilsCrossed size={22} className="text-indigo-600 shrink-0 sm:w-6 sm:h-6" />
          Menu
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Menu version <span className="font-mono font-medium text-slate-700">{version}</span>
          {isAdmin(role) ? ' — changes bump the version for order snapshots.' : ' — read-only for your role.'}
        </p>
      </div>

      {isAdmin(role) && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg shadow-card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
            <input
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              placeholder="Mains, Drinks…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Price (₹)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description (optional)</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 text-white text-sm font-semibold px-5 py-3 sm:py-2 hover:bg-indigo-700 touch-manipulation min-h-11 sm:min-h-0"
            >
              Add menu item
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-card p-10 text-center text-slate-400 text-sm">
          No items yet.{isAdmin(role) ? ' Add dishes above.' : ' Ask an admin to build the menu.'}
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([category, rows]) => (
            <div key={category} className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h2 className="font-semibold text-slate-800">{category}</h2>
              </div>
              <ul className="divide-y divide-slate-50">
                {rows.map((it) => (
                  <li key={it.id} className="px-5 py-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`font-medium ${it.isAvailable ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {it.name}
                      </p>
                      {it.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{it.description}</p>
                      )}
                      <p className="text-sm font-semibold text-slate-800 mt-1">{formatInr(it.price)}</p>
                    </div>
                    {isAdmin(role) && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAvailable(it)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          {it.isAvailable ? 'Mark unavailable' : 'Mark available'}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(it.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

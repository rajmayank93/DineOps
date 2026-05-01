import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { UserPlus } from 'lucide-react'
import { createStaff, listStaff } from '../../services/api'
import type { StaffUser } from '../../services/api'

export function Staff() {
  const [users, setUsers]         = useState<StaffUser[]>([])
  const [loading, setLoading]    = useState(true)
  const [saving, setSaving]      = useState(false)
  const [error, setError]        = useState('')
  const [email, setEmail]        = useState('')
  const [password, setPassword]  = useState('')
  const [role, setRole]          = useState<'waiter' | 'kitchen'>('waiter')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { users: rows } = await listStaff()
      setUsers(rows)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not load staff.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createStaff({ email: email.trim(), password, role })
      setEmail('')
      setPassword('')
      await load()
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not create account.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
        <p className="text-slate-500 text-sm mt-1">
          Restaurant signup creates the <span className="font-medium text-slate-700">admin</span> owner only.
          Add waiter or kitchen accounts here; they can log in with the same login page using their email and
          password.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="font-semibold text-slate-900 text-[15px] mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-indigo-600" />
          Add staff member
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="staff-email" className="block text-xs font-semibold text-slate-500 mb-1">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="staff-password" className="block text-xs font-semibold text-slate-500 mb-1">
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div className="w-full sm:w-40">
            <label htmlFor="staff-role" className="block text-xs font-semibold text-slate-500 mb-1">
              Role
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(ev) => setRole(ev.target.value as 'waiter' | 'kitchen')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 text-white text-sm font-semibold px-5 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-[15px]">Team members</h2>
          <p className="text-xs text-slate-400 mt-0.5">All users for your restaurant</p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Loading…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No users yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.email}</p>
                  <p className="text-xs text-slate-400 capitalize">{u.role}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
